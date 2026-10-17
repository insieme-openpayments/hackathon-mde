# Insieme Backend

API Express + Objection/Knex sobre Postgres. Paquete `@insieme/backend`.

Expone el catálogo de convenios, la validación de facturas, la creación y seguimiento de órdenes con Open Payments, y la liquidación de facturas con proveedores.

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

| Variable                     | Obligatoria | Descripción                                                                                                               |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                       | sí          | Puerto del servidor (3004 en local)                                                                                       |
| `NODE_ENV`                   | sí          | Entorno (`development`, `production`)                                                                                     |
| `FRONTEND_URL`               | sí          | Origen del frontend, para CORS y redirecciones                                                                            |
| `DATABASE_URL`               | sí          | Conexión a Postgres                                                                                                       |
| `PAYMENT_POINTER`            | sí          | URL de la billetera de recaudo, con `https://`                                                                            |
| `KEY_ID`                     | sí          | Id de la llave de Developer Keys                                                                                          |
| `PRIVATE_KEY`                | sí          | Llave privada en base64                                                                                                   |
| `USE_HTTP_FOR_OPEN_PAYMENTS` | no          | Usa HTTP en vez de HTTPS para las llamadas de Open Payments (solo desarrollo)                                             |
| `INTEGRATION_API_URL`        | no          | URL del integration-backend (p. ej. `http://localhost:8000`). Sin ella se usa el catálogo y la factura locales            |
| `INTEGRATION_API_KEY`        | no          | API key del integration-backend (por defecto `insieme-dev-key`)                                                           |
| `SIM_FAIL_PROVIDER`          | no          | Lista separada por comas de proveedores de liquidación que fallan a propósito (p. ej. `puntored`) para probar el failover |

## Endpoints

| Método | Ruta                             | Descripción                                                                         |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/config`                        | Moneda de la billetera de recaudo (`assetCode`, `assetScale`) y estado del catálogo |
| GET    | `/catalog?type=`                 | Categorías y convenios                                                              |
| GET    | `/products?type=&category=`      | Convenios filtrados                                                                 |
| GET    | `/products/:slug`                | Un convenio (404 si no existe)                                                      |
| POST   | `/bills/lookup`                  | Consulta una factura por `productId` y `ref1`                                       |
| POST   | `/orders`                        | Crea una orden con un ítem y devuelve `redirectUrl` y `orderId`                     |
| POST   | `/orders/instant-buy`            | Pago instantáneo con token de one-click                                             |
| POST   | `/orders/setup-one-click`        | Inicia la configuración de pago en un clic                                          |
| POST   | `/orders/setup-one-click/finish` | Termina la configuración de pago en un clic                                         |
| PATCH  | `/orders/:id`                    | Confirma el consentimiento (`interact_ref`, hash) y ejecuta el pago                 |
| GET    | `/orders/:id`                    | Comprobante de la orden (sin datos del proveedor)                                   |
| GET    | `/admin/orders`                  | Vista interna: estado, proveedor que liquidó e intentos. Sin autenticación          |
| GET    | `/images/*`                      | Logos de convenios                                                                  |

Errores: `{ success: false, message, errors: { campo: mensaje } }`. Respuestas correctas: `{ success: true, message, result }`.

## Estructura

- `src/app.ts`: rutas y arranque (migraciones, sincronización de catálogo, poller).
- `src/catalog/sync.ts`: sincronización del catálogo desde integration-backend.
- `src/integration/client.ts`: cliente HTTP del integration-backend.
- `src/bill/`: lookup, snapshot del monto y `simulate.ts` (fallback determinista).
- `src/order/`, `src/order-item/`: órdenes, precios y estados.
- `src/open-payments/`, `src/payment/`: Open Payments y poller de pagos.
- `src/settlement/`: liquidación con proveedores y failover.
- `migrations/`: esquema y semilla del catálogo (`data/catalog.json`).
- `tests/`: pruebas por módulo.
