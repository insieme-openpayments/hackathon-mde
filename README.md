# Insieme Payments

Paga la factura de tu familia en Colombia desde cualquier lugar, con Open Payments.

Hackathon Open Payments (Interledger Foundation) · Medellín · 16–17 oct 2026 · Equipo **Insieme** (mesa 4)

**Problema.** Un colombiano en el exterior que paga la luz, la administración o el colegio de un familiar mayor hoy usa una remesa: el familiar recibe efectivo y tiene que ir a pagar. Con Insieme el dinero llega **directo a la obligación**.

**Cómo.** El pagador autoriza con su billetera Open Payments un monto exacto (grant GNAP con límite). Insieme cobra en COP y **solo cuando el incoming payment está completado** libera el pago de la factura a través de una red de recaudo en Colombia. La interfaz muestra "Pago de servicios" y el convenio (p. ej. Vanti), nunca el nombre del proveedor que ejecuta el pago.

## Qué es real y qué es simulado

| Pieza                                                                                                                               | Estado                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Payments: incoming payment, quote, grant interactivo, outgoing payment, verificación del hash GNAP                             | **Real** (SDK `@interledger/open-payments`, wallets de la testnet)                                                                                                                                                                                |
| Liberación condicionada al incoming payment `COMPLETED`, idempotente por orden y por `incomingPaymentUrl`, anti-replay del callback | **Real** (con pruebas)                                                                                                                                                                                                                            |
| Catálogo de convenios y validación de referencia                                                                                    | **Real pero de prueba**: lo sirve el [integration-backend](https://github.com/insieme-openpayments/integration-backend) del equipo (dummy). Si no responde, el backend usa el catálogo y la factura locales (mismos 12 categorías y 36 convenios) |
| Monto de la factura                                                                                                                 | **Aleatorio por consulta** ($80.000–$350.000 en el integration-backend). El backend guarda el monto consultado 30 min y cobra ese, nunca el que envía el cliente                                                                                  |
| Liquidación con redes de recaudo (PuntoRed, Recaudo B, Bre-B)                                                                       | **Simulada** tras una interfaz común (`PaymentProvider`). No hay sandbox público; la integración real reemplaza el cuerpo de `pay()`                                                                                                              |
| Detalle de la factura consultada en Pago de servicios (titular, concepto y vencimiento)                                             | Titular y concepto **simulados** (deterministas por convenio y referencia); vencimiento del integration-backend, simulado solo en el fallback local                                                                                               |

## Correr

Requisitos: Node >= 24 (ver `.nvmrc`), pnpm 9 (`npx -y pnpm@9.1.4` si no está instalado) y Docker (Postgres y tests con testcontainers).

```bash
pnpm install
pnpm build          # shared, backend y frontend
pnpm local:up       # Postgres en localhost:15434
pnpm dev            # backend en :3004, frontend en :4004
```

Abre http://localhost:4004.

Todo en Docker (imágenes de producción del backend y el frontend junto a Postgres):

```bash
pnpm docker:up      # build + postgres, backend (:3004) y frontend (:4004)
pnpm docker:logs
pnpm docker:down
```

### Credenciales de Open Payments

Las tres variables de Open Payments van en `backend/.env.local` (copia `backend/.env.example`; el archivo está en `.gitignore` y fuera de las imágenes Docker):

- `PAYMENT_POINTER`: URL de la billetera de recaudo, con `https://` (no el formato `$`).
- `KEY_ID`: id de la llave en Developer Keys de esa billetera.
- `PRIVATE_KEY`: llave privada en base64.

El nombre público de la billetera de recaudo (Settings de la billetera) es el que ve el pagador en la pantalla de consentimiento; ponle «Insieme Payments».

El backend no arranca sin ellas. Para generar la llave: crea una billetera en https://wallet.interledger-test.dev, abre Settings → Developer Keys y genera un par para la dirección de la billetera.

`INTEGRATION_API_URL` es opcional. Si lo defines (local: `http://localhost:8000`, en Docker: `http://host.docker.internal:8000`), el backend consulta el catálogo y la validación de referencias al integration-backend del equipo; si lo omites o no responde, usa el catálogo local. `INTEGRATION_API_KEY` tiene como valor por defecto `insieme-dev-key`.

Detalles por paquete: [backend/README.md](backend/README.md) y [frontend/README.md](frontend/README.md).

## Estructura

```
backend/            API Express + Objection/Knex + Open Payments (@insieme/backend)
frontend/           SPA React + Vite + Tailwind (@insieme/frontend)
shared/             esquemas zod y tipos del contrato, compartidos (@insieme/shared)
local/              docker compose: Postgres y stack completo
customer-frontend/  prototipo estático del Figma "Marca Blanca" (solo referencia de comportamiento y copy)
docs/               arquitectura, modelo de amenazas y guion de pitch
prompts/            prompts de la sesión con Claude Code y de los workflows
AI_USAGE.md         uso de IA en el proyecto (política del hackatón)
```

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): flujo de un pago de extremo a extremo y decisiones de diseño.
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md): amenazas, mitigaciones y estado.
- [docs/PITCH.md](docs/PITCH.md): guion de 5 minutos con la demo.
- [AI_USAGE.md](AI_USAGE.md) y [prompts/](prompts/README.md): uso de IA y prompts reales.

## Límites conocidos

- Sin autenticación de usuarios: cualquiera puede consultar y crear órdenes.
- `GET /admin/orders` no tiene autenticación; está pensado como vista interna.
- Sin reembolso automático: si la liquidación falla, la orden queda `SETTLEMENT_FAILED` y el dinero queda registrado para reintento o reembolso manual.
- Las redes de recaudo están simuladas.
- Una factura de tipo `kind: 'factura'` (monto libre) no tiene tope frente a la factura real; ver [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
- Marco regulatorio pendiente: mandato de pago frente a captación, y la entidad regulada detrás de la billetera COP, por validar con un aliado financiero.
- El catálogo, los montos y las facturas del integration-backend son de prueba.

## Atribución

- Upstream: https://github.com/interledger/testnet
- Forked from: `packages/boutique` (plus its `packages/shared/backend` helpers)
  at commit [`09dd1fb3cc77eff9e4b08f112be39a80f99d149d`](https://github.com/interledger/testnet/tree/09dd1fb3cc77eff9e4b08f112be39a80f99d149d/packages/boutique)
- License: Apache-2.0 (see `LICENSE`, retained from upstream)
