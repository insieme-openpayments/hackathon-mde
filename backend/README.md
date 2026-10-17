# Insieme Backend

API Express + Objection/Knex sobre Postgres. Paquete `@insieme/backend`.

Expone el catálogo de convenios, giros y transferencias; la validación de facturas; la cotización de giros Efecty y la resolución de llaves Bre-B; la creación y seguimiento de órdenes con Open Payments; y la liquidación de cada producto contra el integration-backend.

## Scripts

Desde la raíz del repo (`pnpm --filter @insieme/backend <script>`):

| Script  | Qué hace                                                           |
| ------- | ------------------------------------------------------------------ |
| `dev`   | Vigila `src/` y `../shared/src`, compila y arranca `dist/index.js` |
| `build` | Compila `shared` y el backend (`tsc` + `tsc-alias`)                |
| `start` | Arranca `dist/index.js` leyendo `.env.local` y `.env` si existen   |
| `test`  | Pruebas con jest y testcontainers (requiere Docker)                |

## Variables de entorno

Van en `backend/.env.local` (o `backend/.env`), que están en `.gitignore`. Plantilla: `backend/.env.example`.

| Variable                     | Obligatoria | Descripción                                                                                                                                                                                                    |
| ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                       | sí          | Puerto del servidor (3004 en local)                                                                                                                                                                            |
| `NODE_ENV`                   | sí          | Entorno (`development`, `production`)                                                                                                                                                                          |
| `FRONTEND_URL`               | sí          | Origen del frontend, para CORS y redirecciones                                                                                                                                                                 |
| `DATABASE_URL`               | sí          | Conexión a Postgres                                                                                                                                                                                            |
| `PAYMENT_POINTER`            | sí          | URL de la billetera de recaudo, con `https://`                                                                                                                                                                 |
| `KEY_ID`                     | sí          | Id de la llave de Developer Keys                                                                                                                                                                               |
| `PRIVATE_KEY`                | sí          | Llave privada en base64                                                                                                                                                                                        |
| `USE_HTTP_FOR_OPEN_PAYMENTS` | no          | Usa HTTP en vez de HTTPS para las llamadas de Open Payments (solo desarrollo)                                                                                                                                  |
| `INTEGRATION_API_URL`        | no          | URL del integration-backend. Local con mock: `http://127.0.0.1:8001`; en Docker: `http://host.docker.internal:8001`. Sin ella: catálogo, facturas y cotizaciones locales, y liquidación con la cadena simulada |
| `INTEGRATION_API_KEY`        | no          | API key del integration-backend, enviada en `X-API-Key` (por defecto `insieme-dev-key`)                                                                                                                        |
| `SIM_FAIL_PROVIDER`          | no          | Lista separada por comas de proveedores de la cadena simulada que fallan a propósito (p. ej. `puntored`). Solo aplica sin `INTEGRATION_API_URL`                                                                |

Timeouts del cliente del integration-backend: 6 s por defecto y 30 s para `services/pay`, `efecty/transfers` y `breb/transfers`.

## Endpoints

| Método | Ruta                             | Descripción                                                                                                                                                                                                                                                                                                                           |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/config`                        | Moneda de la billetera de recaudo (`assetCode`, `assetScale`) y estado del catálogo                                                                                                                                                                                                                                                   |
| GET    | `/catalog?type=`                 | Categorías y convenios. Por defecto solo `type=servicio`; los giros y transferencias no aparecen en la grilla                                                                                                                                                                                                                         |
| GET    | `/products?type=&category=`      | Productos filtrados. `type` puede ser `servicio`, `giro` o `transferencia` (p. ej. `GET /products?type=giro` lista Giro Efecty). `metadata.enabled` indica si está activo                                                                                                                                                             |
| GET    | `/products/:slug`                | Un producto (404 si no existe)                                                                                                                                                                                                                                                                                                        |
| POST   | `/bills/lookup`                  | Consulta una factura por `productId` y `ref1`                                                                                                                                                                                                                                                                                         |
| POST   | `/efecty/quote`                  | Cotiza un giro Efecty: `recipientDocument`, `recipientName`, `recipientPhone?`, `amount`. Devuelve `EfectyQuote` con `fee`, `total` y `simulated` (`true` solo en la cotización local). Un 422 del upstream llega como 400 con `errors.amount` o `errors.recipientDocument`. Sin integration-backend, cotización local con comisión 0 |
| POST   | `/breb/resolve`                  | Resuelve una llave Bre-B (`key`) y devuelve `BrebKeyResolution` (titular, banco, tipo de llave y `simulated`, que es `true` solo en la resolución local). Un 404 del upstream llega como 400 con `errors.key`. Sin integration-backend, mock local con la misma regla. Sin autenticación (ver THREAT_MODEL)                           |
| POST   | `/orders`                        | Crea una orden con un ítem (`kind`: `servicio`, `factura`, `efecty` o `breb`) y devuelve `redirectUrl` y `orderId`                                                                                                                                                                                                                    |
| POST   | `/orders/instant-buy`            | Pago instantáneo con token de one-click; acepta los mismos `kind`                                                                                                                                                                                                                                                                     |
| POST   | `/orders/setup-one-click`        | Inicia la configuración de pago en un clic                                                                                                                                                                                                                                                                                            |
| POST   | `/orders/setup-one-click/finish` | Termina la configuración de pago en un clic                                                                                                                                                                                                                                                                                           |
| PATCH  | `/orders/:id`                    | Confirma el consentimiento (`interact_ref`, hash) y ejecuta el pago                                                                                                                                                                                                                                                                   |
| GET    | `/orders/:id`                    | Comprobante de la orden. Sin datos del proveedor; `settlement.receipt` trae la referencia, el estado y, en giros, las instrucciones de reclamo                                                                                                                                                                                        |
| GET    | `/admin/orders`                  | Vista interna: estado, proveedor que liquidó e intentos. Sin autenticación                                                                                                                                                                                                                                                            |
| GET    | `/images/*`                      | Logos de convenios                                                                                                                                                                                                                                                                                                                    |

Errores: `{ success: false, message, errors: { campo: mensaje } }`. Respuestas correctas: `{ success: true, message, result }`.

### Liquidación por `kind`

Con `INTEGRATION_API_URL`, al completarse el pago el backend llama al integration-backend:

- `servicio` y `factura`: `POST /v1/services/pay`.
- `efecty`: `POST /v1/efecty/transfers`.
- `breb`: `POST /v1/breb/transfers`.

Un 409, 422, 502 o 504, o una caída del integration-backend, deja la liquidación en `FAILED` con el motivo. No hay failover a los proveedores simulados. Sin `INTEGRATION_API_URL` (tests y modo local), se usa la cadena simulada de `src/settlement/providers/index.ts`.

## Estructura

- `src/app.ts`: rutas y arranque (migraciones, sincronización de catálogo, poller).
- `src/catalog/sync.ts`: sincronización del catálogo desde integration-backend. Marca `metadata.active` en los convenios de servicio; nunca borra filas.
- `src/integration/client.ts`: cliente HTTP del integration-backend (axios, `X-API-Key`, `HttpError` e `IntegrationUnavailable`).
- `src/money/`: cotización de Efecty y resolución de llaves Bre-B, con mock local de respaldo.
- `src/bill/`: lookup, snapshot del monto (30 min, con `trace`) y `simulate.ts` (fallback determinista).
- `src/order/`, `src/order-item/`: órdenes, precios y estados.
- `src/open-payments/`, `src/payment/`: Open Payments y poller de pagos.
- `src/settlement/`: liquidación por `kind` (`providers/integration.ts`) y cadena simulada sin integración (`providers/index.ts`).
- `migrations/`: esquema, semilla del catálogo (`data/catalog.json`) y productos `efecty` y `breb`.
- `tests/`: pruebas por módulo.
