# Boutique (fork)

Standalone fork of the **Interledger Testnet Boutique**, an example e-commerce
app that accepts payments through [Open Payments](https://openpayments.dev).

- Upstream: https://github.com/interledger/testnet
- Forked from: `packages/boutique` (plus its `packages/shared/backend` helpers)
  at commit [`09dd1fb3cc77eff9e4b08f112be39a80f99d149d`](https://github.com/interledger/testnet/tree/09dd1fb3cc77eff9e4b08f112be39a80f99d149d/packages/boutique)
- License: Apache-2.0 (see `LICENSE`, retained from upstream)

This first version is a 1:1 working copy. Branding / identity changes come later.

## Layout

```
backend/     Express + Objection/Knex API (@boutique/backend)
  src/lib/   upstream @shared/backend helpers (errors, BaseModel, logger, knex, cache)
frontend/    React + Vite + Tailwind SPA (@boutique/frontend)
shared/      zod schemas shared by both (@boutique/shared)
local/       docker compose files (Postgres; full stack)
```

## Requirements

- Node >= 24 (`.nvmrc` says 24)
- pnpm 9 (`npx pnpm@9` works if it is not installed globally)
- Docker (Postgres for the backend, and testcontainers for backend tests)

## Setup

```sh
pnpm install
pnpm build          # builds shared packages, backend and frontend
pnpm local:up       # starts Postgres on localhost:15434
pnpm dev            # backend on :3004, frontend on :4004
```

Open http://localhost:4004.

### Everything in Docker

`local/docker-compose.app.yml` builds the production images (`Dockerfile.prod`
of backend and frontend) and runs them next to Postgres:

```sh
pnpm docker:up      # build + start postgres, backend (:3004) and frontend (:4004)
pnpm docker:logs    # follow logs
pnpm docker:down    # stop
```

The backend container reads your Open Payments credentials from
`backend/.env.local` (or `backend/.env`, which wins) via `env_file`; DB URL,
port and `FRONTEND_URL` are overridden in the compose file. `env_file` is read
when the container is created, so after editing it run `pnpm docker:up` again
to recreate the backend.

## Configuration

Backend env lives in `backend/.env.local`: copy `backend/.env.example` and
uncomment what you need. Both `.env.local` and `.env` are gitignored and
excluded from Docker builds, so real credentials never reach the repo or an
image. The DB and ports already work with the example values.

To actually pay, set the Open Payments credentials of your own test wallet:

1. Create a wallet at https://wallet.interledger-test.dev and a USD wallet address.
2. Settings -> Developer Keys -> generate a key pair for that wallet address.
3. Fill in:
   - `PAYMENT_POINTER` – the wallet address URL, with `https://` (not `$`)
   - `KEY_ID` – the key id shown in Developer Keys
   - `PRIVATE_KEY` – the base64-encoded private key

The server refuses to boot without these three variables.

### Currency

The shop charges in the asset of its wallet address (`PAYMENT_POINTER`). The
backend exposes it at `GET /config` (`assetCode`, `assetScale`) and the
frontend loads it at startup to format every price, so the UI always shows the
currency that is actually charged. `VITE_CURRENCY` / `CURRENCY` are only the
fallback if that request fails. What the payer sees in their own wallet is the
testnet's quote in the payer's currency, converted at the testnet's rate.

Frontend env is in `frontend/.env.local` (gitignored; see `.env.example`):
`VITE_API_BASE_URL`, `VITE_THEME`, `VITE_CURRENCY`. Without it the dev server
talks to `http://localhost:3004`.

## Differences from upstream

- Monorepo trimmed to the boutique packages; wallet, e2e, helm and Traefik removed.
- Packages live at the repo root (`backend/`, `frontend/`, `shared/`) instead of `packages/`.
- `@shared/backend` was folded into `backend/src/lib` (imported as `@/lib`); its
  unused Redis cache client was dropped.
- `local/docker-compose.yml` only runs Postgres (the boutique does not use Redis).
- URLs default to plain `http://localhost` instead of the `*.test` TLS hosts.
- `engines.node` relaxed to `>=24`.
- `testcontainers` added as a backend devDependency so `pnpm test` works.
