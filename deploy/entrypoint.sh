#!/bin/sh
# Arranque de la imagen insieme-demo: prepara configuración y lanza todo con supervisord.
set -eu

log() { echo "[insieme] $*"; }
die() { echo "[insieme] ERROR: $*" >&2; exit 1; }

PORT="${PORT:-8080}"
export PORT

# ---------- URLs públicas ----------
# PUBLIC_URL = origen público del deploy (p. ej. https://demo.insieme.co). Open Payments redirige
# al usuario a FRONTEND_URL al terminar la interacción, así que debe ser alcanzable desde el navegador.
PUBLIC_URL="${PUBLIC_URL:-http://localhost:${PORT}}"
PUBLIC_URL="${PUBLIC_URL%/}"
export FRONTEND_URL="${FRONTEND_URL:-${PUBLIC_URL}/pay}"

# ---------- Credenciales Open Payments (obligatorias para el backend Node) ----------
missing=""
for v in PAYMENT_POINTER KEY_ID PRIVATE_KEY; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || missing="$missing $v"
done
[ -z "$missing" ] || die "faltan variables de Open Payments:$missing (ver deploy/README.md)"

# ---------- integration-backend (solo interno, 127.0.0.1:8000) ----------
export API_KEY="${API_KEY:-insieme-dev-key}"
export INTEGRATION_API_KEY="${INTEGRATION_API_KEY:-$API_KEY}"
export INTEGRATION_API_URL="${INTEGRATION_API_URL:-http://127.0.0.1:8000}"
export CATALOG_SOURCE="${CATALOG_SOURCE:-dummy}"
export CORS_ORIGINS="${CORS_ORIGINS:-$PUBLIC_URL}"

# ---------- Postgres: embebido salvo que llegue DATABASE_URL ----------
EMBEDDED_PG=0
if [ -z "${DATABASE_URL:-}" ]; then
  EMBEDDED_PG=1
  export DATABASE_URL="postgres://insieme_backend:insieme_backend@127.0.0.1:5432/insieme_backend"
  mkdir -p "$PGDATA" /run/postgresql
  chown -R postgres:postgres "$PGDATA" /run/postgresql
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    log "inicializando Postgres en $PGDATA"
    su-exec postgres initdb -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 >/dev/null
    su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses=127.0.0.1" -w start >/dev/null
    su-exec postgres psql -v ON_ERROR_STOP=1 -q -U postgres -h 127.0.0.1 <<'SQL'
CREATE USER insieme_backend WITH PASSWORD 'insieme_backend';
CREATE DATABASE insieme_backend OWNER insieme_backend;
SQL
    su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null
  fi
else
  log "usando DATABASE_URL externo (Postgres embebido desactivado)"
fi

# ---------- Frontend: configuración en tiempo de ejecución ----------
cat > /usr/share/nginx/html/pay/env.js <<EOF
window.__env__ = {
  API_BASE_URL: '${API_BASE_URL:-/api}',
  THEME: '${THEME:-dark}',
  CURRENCY: '${CURRENCY:-COP}',
};
EOF
sed "s/__PORT__/${PORT}/" /etc/insieme/nginx.conf.template > /etc/nginx/http.d/insieme.conf

# ---------- supervisord ----------
CONF=/etc/insieme/supervisord.conf
cat > "$CONF" <<EOF
[supervisord]
nodaemon=true
user=root
logfile=/dev/null
logfile_maxbytes=0
pidfile=/run/supervisord.pid

[program:integration]
directory=/opt/integration
command=/opt/integration/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
user=node
priority=10
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true

[program:backend]
directory=/app
command=/bin/sh -c 'if [ "$EMBEDDED_PG" = 1 ]; then until pg_isready -q -h 127.0.0.1 -p 5432 -U postgres; do sleep 1; done; fi; exec node backend/dist/index.js'
environment=PORT="3004"
user=node
priority=20
autorestart=true
startsecs=5
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true

[program:nginx]
command=nginx -g 'daemon off;'
priority=30
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true
EOF

if [ "$EMBEDDED_PG" = 1 ]; then
  cat >> "$CONF" <<EOF

[program:postgres]
command=postgres -D $PGDATA -c listen_addresses=127.0.0.1
user=postgres
priority=1
autorestart=true
stopsignal=INT
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true
EOF
fi

log "listo: http://0.0.0.0:${PORT}  (landing /, app ${FRONTEND_URL}, API /api, catálogo ${CATALOG_SOURCE})"
exec supervisord -c "$CONF"
