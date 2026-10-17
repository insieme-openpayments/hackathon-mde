# Insieme demo: una sola imagen con todo el stack.
#
#   nginx :$PORT ─┬─ /          landing (frontend/landing)
#                 ├─ /pay/      app React (frontend)
#                 └─ /api/   →  backend Node :3004 ──→ integration-backend FastAPI :8000 (solo interno)
#                                     └──→ Postgres :5432 embebido (o DATABASE_URL externo)
#
# Contextos: el repo hackathon-mde (.) y el repo integration-backend (contexto con nombre "integration"):
#   docker build -f deploy/Dockerfile --build-context integration=../integration-backend -t insieme-demo .
# Ver deploy/README.md.

ARG NODE_IMAGE=node:24-alpine

########## Frontend (mismos pasos que frontend/Dockerfile.prod) ##########
FROM ${NODE_IMAGE} AS frontend
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc ./
COPY frontend/package.json ./frontend/package.json
COPY shared/package.json ./shared/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install -r --frozen-lockfile
COPY tsconfig.base.json eslint.config.mjs ./
COPY frontend ./frontend
COPY shared ./shared
ENV NODE_ENV=production
RUN pnpm insieme:frontend build

########## Backend Node (mismos pasos que backend/Dockerfile.prod) ##########
FROM ${NODE_IMAGE} AS backend
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install -r --frozen-lockfile
COPY tsconfig.base.json ./
COPY backend ./backend
COPY shared ./shared
RUN pnpm insieme:backend build
RUN rm -rf ./node_modules ./backend/node_modules ./shared/node_modules
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install -r --frozen-lockfile --prod

########## integration-backend (venv sobre el mismo Alpine del runtime) ##########
FROM ${NODE_IMAGE} AS integration-venv
RUN apk add --no-cache python3
COPY --from=integration requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/integration/venv \
 && /opt/integration/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

########## Runtime ##########
FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache nginx supervisor python3 postgresql17 postgresql17-client tini su-exec

ENV NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    PGDATA=/var/lib/postgresql/data

# Backend Node (misma estructura que backend/Dockerfile.prod: /app/backend/dist/index.js)
WORKDIR /app
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/backend/node_modules ./backend/node_modules
COPY --from=backend /app/backend/dist ./backend/dist
COPY --from=backend /app/backend/migrations ./backend/migrations
COPY --from=backend /app/backend/images ./backend/images
COPY --from=backend /app/backend/data ./backend/data
COPY --from=backend /app/shared/node_modules ./shared/node_modules
COPY --from=backend /app/shared/dist ./shared/dist
COPY --from=backend /app/shared/package.json ./shared/package.json

# integration-backend (cwd /opt/integration: PUNTORED_CATALOG_DB=data/... es relativo)
COPY --from=integration-venv /opt/integration/venv /opt/integration/venv
COPY --from=integration app /opt/integration/app
COPY --from=integration data /opt/integration/data

# Frontend estático: landing en la raíz, app React en /pay
COPY frontend/landing /usr/share/nginx/html
COPY --from=frontend /app/frontend/dist /usr/share/nginx/html/pay

COPY deploy/nginx.conf.template /etc/insieme/nginx.conf.template
COPY deploy/entrypoint.sh /usr/local/bin/insieme-entrypoint
RUN chmod +x /usr/local/bin/insieme-entrypoint \
 && rm -f /etc/nginx/http.d/default.conf \
 && mkdir -p /run/nginx /run/postgresql "$PGDATA" \
 && chown -R postgres:postgres /run/postgresql /var/lib/postgresql \
 && chown -R node:node /opt/integration/data /usr/share/nginx/html/pay

EXPOSE 8080
VOLUME ["/var/lib/postgresql/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--", "insieme-entrypoint"]
