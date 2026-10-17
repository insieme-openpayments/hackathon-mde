# Insieme Payments

Paga la factura de tu familia en Colombia desde cualquier lugar, con Open Payments. También puedes enviar un giro en efectivo por Efecty o una transferencia por Bre-B.

Hackathon Open Payments (Interledger Foundation) · Medellín · 16–17 oct 2026 · Equipo **Insieme** (mesa 4)

**Problema.** Un colombiano en el exterior que paga la luz, la administración o el colegio de un familiar mayor hoy usa una remesa: el familiar recibe efectivo y tiene que ir a pagar. Con Insieme el dinero llega **directo a la obligación**.

**Cómo.** El pagador autoriza con su billetera Open Payments un monto exacto (grant GNAP con límite). Insieme cobra en COP y **solo cuando el incoming payment está completado** ejecuta la operación en Colombia a través del integration-backend del equipo. La interfaz muestra "Pago de servicios" y el convenio (p. ej. Vanti), nunca el nombre del proveedor que liquida.

## Productos

| Producto                | Tipo de producto                | Qué hace                                                                                                                                                  |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pago de servicios**   | `servicio` (grilla) y `factura` | Paga un convenio (luz, agua, gas, administración, educación...) con su referencia. La factura se consulta en vivo y el backend cobra el monto consultado. |
| **Giro Efecty**         | `giro` (`efecty`)               | Envía efectivo a un destinatario en Colombia, que lo reclama en Efecty. Antes de confirmar se cotiza la comisión; el pagador paga monto + comisión.       |
| **Transferencia Bre-B** | `transferencia` (`breb`)        | Envía dinero a una llave Bre-B (teléfono, email, documento o llave alfanumérica). El backend resuelve la llave antes de cobrar y muestra el titular.      |

Los giros y las transferencias no aparecen en la grilla de Servicios: viven en la tabla `products` con `category` nula y se listan con `GET /products?type=giro` o `GET /products?type=transferencia`.

**Precio = total de la cotización.** En un giro Efecty el total de la orden es el de la cotización (monto + comisión) en el momento de crear la orden; el servidor lo guarda y lo cobra tal cual. El cliente no envía el total.

## Cuenta Insieme (opcional)

El pago no exige cuenta. Si la persona se registra, la cuenta habilita:

- **Facturas conocidas**: guarda las facturas de Pago de servicios y reúsalas desde «Mis facturas» (`/pay/facturas`).
- **Destinos frecuentes**: guarda los destinatarios de Giro Efecty y Transferencia Bre-B para enviar de nuevo con un clic.
- **Pago en un clic**: si ya concedió el grant de Interledger, la cuenta lo guarda para los envíos a un destino guardado. El backend solo usa el grant guardado cuando la billetera del pago es la misma del grant; la API nunca devuelve sus tokens.

El registro pide nombre completo, documento de identidad (cédula o pasaporte), correo, celular y una contraseña nueva con su confirmación (mínimo 8 caracteres).

**Qué no se verifica.** Es una versión de prueba sobre la testnet de Interledger: no se valida el correo ni el celular (sin código de confirmación), no hay KYC sobre el documento y ningún dato se contrasta con una fuente externa. Sí se exigen presencia, formato básico y un correo único, porque el correo es el identificador de ingreso.

**Cómo probar.** Abre http://localhost:4004/pay/cuenta/registro, crea una cuenta con datos de prueba y haz un giro o una factura. Al confirmar, deja marcado «Guardar este destino para la próxima vez». Para cerrar la sesión usa el botón «Cerrar sesión» en `/pay/cuenta`.

La sesión viaja en `Authorization: Bearer <token>`, dura 30 días y en la base de datos se guarda solo su hash.

## Qué es real y qué es simulado

| Pieza                                                                                                                               | Estado                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Payments: incoming payment, quote, grant interactivo, outgoing payment, verificación del hash GNAP                             | **Real** (SDK `@interledger/open-payments`, wallets de la testnet)                                                                                                                                                                                                                                                                                                  |
| Liberación condicionada al incoming payment `COMPLETED`, idempotente por orden y por `incomingPaymentUrl`, anti-replay del callback | **Real** (con pruebas)                                                                                                                                                                                                                                                                                                                                              |
| Catálogo de convenios y validación de referencia                                                                                    | **Real pero de prueba**: lo sirve el [integration-backend](https://github.com/insieme-openpayments/integration-backend) del equipo. Con `CATALOG_SOURCE=puntored` consulta PuntoRed en preprod (1.143 convenios con ids `pr-<id>`). Si el integration-backend no responde, el backend usa el catálogo y la factura locales (semilla de `backend/data/catalog.json`) |
| Monto de la factura                                                                                                                 | **Aleatorio por consulta** en el mock del integration-backend. El backend guarda el monto consultado 30 min y cobra ese, nunca el que envía el cliente                                                                                                                                                                                                              |
| Giro Efecty: cotización y liquidación                                                                                               | **Mock** del integration-backend. Si no responde, el backend cotiza en local con comisión 0 y marca la cotización con `simulated: true`                                                                                                                                                                                                                             |
| Transferencia Bre-B: resolución de llave y liquidación                                                                              | **Mock** del integration-backend. Si no responde, el backend resuelve la llave en local con la misma regla del mock y marca la resolución con `simulated: true`                                                                                                                                                                                                     |
| Liquidación de servicios                                                                                                            | Con integration-backend configurado: `POST /v1/services/pay` (PuntoRed preprod con `CATALOG_SOURCE=puntored`). Sin integration-backend (tests y modo local): cadena simulada (`puntored`, `recaudo-b`, `breb`) tras la interfaz `PaymentProvider`                                                                                                                   |
| Detalle de la factura consultada en Pago de servicios (titular, concepto y vencimiento)                                             | Titular y concepto **simulados** (deterministas por convenio y referencia); vencimiento del integration-backend, simulado solo en el fallback local                                                                                                                                                                                                                 |
| Cuenta Insieme: registro, ingreso y sesión                                                                                          | **Real** en formato y unicidad del correo; **sin verificación** de correo, celular, documento ni identidad (versión de prueba). Contraseñas con scrypt; sesión Bearer de 30 días con hash en la base                                                                                                                                                                |
| Facturas y destinos guardados en la cuenta                                                                                          | **Real**: se guardan en Postgres por usuario; solo el dueño los lee o los cambia                                                                                                                                                                                                                                                                                    |
| Pago en un clic guardado en la cuenta                                                                                               | **Real** frente a Open Payments. El grant se guarda en la base **sin cifrar** (riesgo aceptado para la demo; cifrado pendiente)                                                                                                                                                                                                                                     |

**Errores reales no se disfrazan.** Si el integration-backend responde con un rechazo (409, 422, 502 o 504) o no responde durante una liquidación, el backend **no** cambia a un proveedor simulado: registra la liquidación como `FAILED` con el motivo. Un 504 o una caída pueden significar que la operación sí se ejecutó, por eso el mensaje pide consultar el estado antes de reintentar.

## Correr

Requisitos: Node >= 24 (ver `.nvmrc`), pnpm 9 (`npx -y pnpm@9.1.4` si no está instalado) y Docker (Postgres y tests con testcontainers).

```bash
pnpm install
pnpm build          # shared, backend y frontend
pnpm local:up       # Postgres en localhost:15434
pnpm dev            # backend en :3004, frontend en :4004
```

- Landing: http://localhost:4004/
- Portal de pagos: http://localhost:4004/pay/

`FRONTEND_URL` debe terminar en `/pay` (p. ej. `FRONTEND_URL=http://localhost:4004/pay`): las URLs de retorno de Open Payments cuelgan de él y CORS usa su origen. Actualiza a mano `backend/.env.local` para `pnpm dev`.

Todo en Docker (imágenes de producción del backend y el frontend junto a Postgres):

```bash
pnpm docker:up      # build + postgres, backend (:3004) y frontend (:4004)
pnpm docker:logs
pnpm docker:down
```

### Con el integration-backend en modo mock

Para Giro Efecty y Transferencia Bre-B, el backend necesita el integration-backend en modo mock/dummy. En este equipo corre en `http://127.0.0.1:8001`. Usa `127.0.0.1`, no `localhost`, en las pruebas con curl.

```bash
# local (backend en el host)
INTEGRATION_API_URL=http://127.0.0.1:8001 pnpm dev

# Docker (el backend apunta al host con host.docker.internal)
INTEGRATION_API_URL=http://host.docker.internal:8001 pnpm docker:up
```

Por defecto, Docker apunta a `host.docker.internal:8000`. Ese puerto puede estar en modo `CATALOG_SOURCE=puntored` (PuntoRed preprod, con pagos reales): no ejecutes `POST /v1/services/pay` contra él desde pruebas. Cada pago real gasta saldo de la billetera de prueba; usa montos mínimos.

### Credenciales de Open Payments

Las tres variables de Open Payments van en `backend/.env.local` (copia `backend/.env.example`; el archivo está en `.gitignore` y fuera de las imágenes Docker):

- `PAYMENT_POINTER`: URL de la billetera de recaudo, con `https://` (no el formato `$`).
- `KEY_ID`: id de la llave en Developer Keys de esa billetera.
- `PRIVATE_KEY`: llave privada en base64.

El nombre público de la billetera de recaudo (Settings de la billetera) es el que ve el pagador en la pantalla de consentimiento; ponle «Insieme Payments».

El backend no arranca sin ellas. Para generar la llave: crea una billetera en https://wallet.interledger-test.dev, abre Settings → Developer Keys y genera un par para la dirección de la billetera.

### integration-backend

| Variable              | Descripción                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTEGRATION_API_URL` | Opcional. URL del integration-backend (local con mock: `http://127.0.0.1:8001`; en Docker: `http://host.docker.internal:8001`). Si la omites, el backend usa el catálogo y las cotizaciones locales, y la liquidación cae a la cadena simulada (solo modo local y tests). |
| `INTEGRATION_API_KEY` | API key del integration-backend en el header `X-API-Key`. Por defecto `insieme-dev-key`.                                                                                                                                                                                  |

Con `INTEGRATION_API_URL` definida, el backend llama al integration-backend con timeout de 6 s, y de 30 s para pagos y transferencias.

Detalles por paquete: [backend/README.md](backend/README.md) y [frontend/README.md](frontend/README.md).

## Estructura

```
backend/            API Express + Objection/Knex + Open Payments (@insieme/backend)
frontend/           SPA React + Vite + Tailwind (@insieme/frontend)
shared/             esquemas zod y tipos del contrato, compartidos (@insieme/shared)
local/              docker compose: Postgres y stack completo
docs/               arquitectura, modelo de amenazas y guion de pitch
prompts/            prompts de la sesión con Claude Code y de los workflows
AI_USAGE.md         uso de IA en el proyecto (política del hackatón)
```

Historia: el prototipo estático `customer-frontend` se retiró del repo en el commit `a7ee705`. Sigue en el historial (commit `ef76b86`). Las pantallas actuales son la migración del prototipo a React; no hay código del prototipo en el árbol.

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): flujo de un pago de extremo a extremo y decisiones de diseño.
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md): amenazas, mitigaciones y estado.
- [docs/PITCH.md](docs/PITCH.md): guion de 5 minutos con la demo.
- [AI_USAGE.md](AI_USAGE.md) y [prompts/](prompts/README.md): uso de IA y prompts reales.

## Límites conocidos

- Autenticación opcional: sin sesión, cualquiera puede consultar y crear órdenes, y consultar llaves Bre-B (`POST /breb/resolve`).
- La cuenta no tiene verificación de identidad, código de confirmación ni límite de intentos de ingreso (ver [Cuenta Insieme](#cuenta-insieme-opcional)).
- `GET /admin/orders` no tiene autenticación; está pensado como vista interna.
- Sin reembolso automático: si la liquidación falla, la orden queda `SETTLEMENT_FAILED` y el dinero queda registrado para reintento o reembolso manual.
- Sin reintento automático de una liquidación con error real (409, 422, 502, 504): la confirmación queda para revisión manual.
- Giro Efecty y Transferencia Bre-B dependen del mock del integration-backend; la red real no está conectada.
- Una factura de tipo `kind: 'factura'` (monto libre) no tiene tope frente a la factura real; ver [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
- Marco regulatorio pendiente: mandato de pago frente a captación, y la entidad regulada detrás de la billetera COP, por validar con un aliado financiero.
- El catálogo, los montos y las facturas del integration-backend son de prueba.

## Atribución

- Upstream: https://github.com/interledger/testnet
- Forked from: `packages/boutique` (plus its `packages/shared/backend` helpers)
  at commit [`09dd1fb3cc77eff9e4b08f112be39a80f99d149d`](https://github.com/interledger/testnet/tree/09dd1fb3cc77eff9e4b08f112be39a80f99d149d/packages/boutique)
- License: Apache-2.0 (see `LICENSE`, retained from upstream)
