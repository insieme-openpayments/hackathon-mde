# Arquitectura

```mermaid
sequenceDiagram
  participant U as Pagador (exterior)
  participant F as Front (público)
  participant B as Backend Insieme (privado)
  participant W as Wallet pagador (Open Payments)
  participant C as Wallet recaudo COP (Open Payments)
  participant R as Router de proveedores
  U->>F: Elige facturador + referencia
  F->>B: lookup / crear orden
  B->>C: grant + incoming payment (monto COP)
  B->>W: grant + quote
  B->>W: grant interactivo outgoing (límite = quote)
  B-->>U: redirect a la wallet
  U->>W: aprueba solo ese monto
  W-->>B: redirect (interact_ref + hash)
  B->>B: verifica hash, anti-replay
  B->>W: continue grant + outgoing payment
  loop poll
    B->>C: ¿incoming completed?
  end
  B->>R: pagar factura (idempotencyKey = incomingPayment.id)
  R->>R: PuntoRed → respaldo → Bre-B
  R-->>B: recibo
  B-->>U: recibo
```

## Decisiones
1. **Un solo flujo** (pagar una factura). El envío a wallet de la madre y el "allowance" quedan como extensión.
2. **El front no nombra al proveedor** (consejo de Roberto): el router elige y hace failover; solo `/api/admin` lo expone.
3. **La fuente de verdad para pagar al corresponsal es el incoming payment completado**, no el redirect del navegador.
4. **Monto autoritativo en servidor**: se reconsulta la factura al crear la orden.
5. **Liquidez (no implementada):** prefondeo en la red de recaudo y reposición por lotes con lo recibido vía Interledger.
