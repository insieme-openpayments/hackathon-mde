# Deploy de la demo en un solo contenedor

Una imagen (`insieme-demo`) con todo el stack, detrás de un único puerto:

| Ruta | Servicio | Interno |
|---|---|---|
| `/` | Landing (`frontend/landing`) | nginx |
| `/pay/` | App React (`frontend`) | nginx |
| `/api/` | Backend Node (`backend`), mismo origen, sin CORS | `127.0.0.1:3004` |
| — | integration-backend (FastAPI), solo lo usa el backend | `127.0.0.1:8000` |
| — | Postgres 17 embebido (o `DATABASE_URL` externo) | `127.0.0.1:5432` |
| `/healthz` | Health check de nginx | |

Los procesos los levanta `supervisord` (`deploy/entrypoint.sh`); los logs de todos salen por stdout.

## Requisitos

- Docker con BuildKit (Docker Desktop o Engine 23+).
- Los dos repos clonados lado a lado (integration-backend es privado, entra como contexto de build local):

```
2026_hackathon/
├── hackathon-mde/          (este repo)
└── integration-backend/
```

- Una wallet de prueba en https://wallet.interledger-test.dev con **Developer Keys** (Key ID + llave privada).

## Correr con Docker Compose

Desde la raíz de este repo:

```bash
cp deploy/.env.example deploy/.env
```

Completa en `deploy/.env` `PAYMENT_POINTER`, `KEY_ID` y `PRIVATE_KEY` (el `.pem` en base64 en una línea:
`base64 < private.key | tr -d '\n'`), y `PUBLIC_URL` si no es `http://localhost:8080`.

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Abre http://localhost:8080 (landing) y http://localhost:8080/pay/ (app). Logs y parada:

```bash
docker compose -f deploy/docker-compose.yml logs -f
```

```bash
docker compose -f deploy/docker-compose.yml down
```

Si integration-backend está en otra ruta: `INTEGRATION_CONTEXT=/ruta/a/integration-backend docker compose ...`.
Otro puerto en el host: `HOST_PORT=9000`.

## Construir y correr sin Compose

```bash
docker build -f deploy/Dockerfile --build-context integration=../integration-backend -t insieme-demo .
```

```bash
docker run -d --name insieme-demo -p 8080:8080 --env-file deploy/.env -v insieme-pg:/var/lib/postgresql/data insieme-demo
```

Para un servidor x86_64 desde un Mac con Apple Silicon, agrega `--platform linux/amd64` al build.

## Variables

| Variable | Por defecto | Uso |
|---|---|---|
| `PAYMENT_POINTER`, `KEY_ID`, `PRIVATE_KEY` | — (obligatorias) | Credenciales Open Payments del comercio; sin ellas el contenedor no arranca |
| `PUBLIC_URL` | `http://localhost:$PORT` | Origen público; Open Payments redirige a `$PUBLIC_URL/pay` tras aprobar el pago |
| `FRONTEND_URL` | `$PUBLIC_URL/pay` | Sobrescribe la URL de retorno completa |
| `PORT` | `8080` | Puerto de nginx dentro del contenedor (plataformas como Render/Railway lo inyectan) |
| `API_KEY` | `insieme-dev-key` | Llave entre backend e integration-backend (`INTEGRATION_API_KEY` toma el mismo valor) |
| `CATALOG_SOURCE` | `dummy` | `puntored` = catálogo y pagos reales en PuntoRed preprod (requiere `PUNTORED_*`) |
| `PUNTORED_*`, `EFECTY_PROVIDER`, `BREB_PROVIDER`… | ver integration-backend | Se pasan tal cual a integration-backend |
| `DATABASE_URL` | Postgres embebido | Postgres externo; si se define no se arranca el embebido |
| `THEME`, `CURRENCY` | `dark`, `COP` | Configuración del frontend (`/pay/env.js`) |
| `SIM_FAIL_PROVIDER` | — | Proveedores de liquidación forzados a fallar (demo de failover) |

## Datos

- Postgres embebido guarda en `/var/lib/postgresql/data`: monta un volumen (Compose ya lo hace) o se pierde al recrear el contenedor. Las migraciones del backend corren solas al arrancar.
- Los giros Efecty y transferencias Bre-B `mock` de integration-backend viven en memoria.

## Deploy en un servidor

Cualquier host con Docker sirve (VM, Render, Railway, Fly.io…): publica el puerto 8080 detrás de HTTPS,
define `PUBLIC_URL=https://tu-dominio` y las credenciales como secretos, y monta un volumen en
`/var/lib/postgresql/data` (o usa `DATABASE_URL` de un Postgres administrado).
