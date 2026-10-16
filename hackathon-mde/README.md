# Insieme — paga la factura de tu familia en Colombia desde cualquier lugar

Hackathon Open Payments (Interledger Foundation) · Medellín · 16–17 oct 2026 · Equipo **Insieme** (mesa 4)

**Problema.** Un colombiano en el exterior que paga la luz, la administración o el colegio de un familiar mayor hoy usa una remesa: el familiar recibe efectivo, y tiene que ir a pagar. Aquí el dinero llega **directo a la obligación**.

**Cómo.** El pagador autoriza con su billetera Open Payments un monto exacto (GNAP con límite). Insieme cobra en COP, y **solo cuando el incoming payment está completado** libera el pago de la factura a través de una red de recaudo en Colombia. El front muestra "factura de EPM", nunca el nombre de la red que ejecuta.

## Qué es real y qué es simulado (dicho sin rodeos)

| Pieza | Estado |
|---|---|
| Open Payments: incoming payment, quote, grant interactivo, outgoing payment, verificación del hash GNAP | **Real** (SDK `@interledger/open-payments` 7.4.0, wallet de prueba) |
| Liberación condicionada al incoming payment `completed`, idempotente por `incomingPayment.id`, anti-replay del callback | **Real** (con pruebas) |
| PuntoRed, Efecty/Baloto-like, Bre-B/Transfiya, facturadores | **Simulados** tras una interfaz común (`src/providers/`). No hay sandbox público; la integración real reemplaza el cuerpo de `pay()` |
| Catálogo y facturas | Datos inventados |

## Correr

```bash
npm install
cp .env.example .env        # completa wallets y KEY_ID; copia private.key (NO se versiona)
npm start                   # http://localhost:3000
npm test                    # hash GNAP, idempotencia, anti-replay, failover
npm run demo                # ensayo de UI SIN Open Payments real (no usar con jurados)
```
Para probar failover: `SIM_FAIL_PROVIDER=puntored npm start` → la factura se paga por otro proveedor y la UI no cambia. `GET /api/admin/orders` muestra qué proveedor ejecutó.

## Estructura
- `src/openpayments.js` flujo Open Payments · `src/gnap.js` hash del redirect
- `src/orders.js` máquina de estados + reconciliación idempotente
- `src/providers/` interfaz `PaymentProvider`, router con failover, adaptadores simulados
- `public/` UI · `docs/` arquitectura, amenazas, guion · `ai-disclosure/` uso de IA

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), [docs/PITCH.md](docs/PITCH.md).

## Límites conocidos
Estado en memoria (se pierde al reiniciar); sin autenticación de usuario; sin reembolso automático si falla la liquidación (queda `settlement_failed`); marco regulatorio (mandato de pago vs. captación, entidad regulada detrás de la wallet COP) pendiente de validar con el aliado financiero.
