# Arquitectura

## Flujo de un pago de servicio

```mermaid
sequenceDiagram
  autonumber
  actor U as Pagador
  participant F as Frontend React
  participant B as Backend Node
  participant IB as integration-backend
  participant W as Billetera pagadora (Open Payments)
  participant R as Billetera de recaudo COP
  participant S as SettlementService
  participant P as Proveedores con failover

  U->>F: Servicios, convenio, referencia y Consultar
  F->>B: POST /bills/lookup (productId, ref1)
  B->>IB: POST /v1/services/validate (X-API-Key)
  alt integration-backend no responde
    B->>B: Fallback simulateBill con warn
  end
  IB-->>B: monto, parcial, minimo, maximo, vencimiento
  B->>B: Guarda snapshot del monto (30 min)
  B-->>F: BillLookupResult (titular, concepto, vence)
  U->>F: Confirmar con billetera
  F->>B: POST /orders (walletAddressUrl, products)
  B->>B: priceOrderItem toma el monto del snapshot
  B->>R: Crea incoming payment en COP
  B->>W: Crea quote y grant interactivo de pago saliente
  B-->>F: redirectUrl y orderId
  F->>W: Redirección a la billetera
  U->>W: Consentimiento del grant
  W-->>F: /checkout/confirmation?orderId (interact_ref, hash)
  F->>B: PATCH /orders/:id (interact_ref, hash)
  B->>B: verifyHash y ensurePendingState
  B->>W: Continúa el grant y crea el pago saliente
  loop Poller de pagos pendientes
    B->>R: Consulta el incoming payment
  end
  R-->>B: COMPLETED
  B->>S: settle(order)
  S->>P: pay() con failover por categoría
  P-->>S: authCode y attempts
  S-->>B: SETTLED (o SETTLEMENT_FAILED)
  loop UI mientras no es final
    F->>B: GET /orders/:id
    B-->>F: OrderReceipt (status, events)
  end
```

## Componentes

| Capa          | Ubicación                                                                                          | Responsabilidad                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Frontend      | `frontend/src/app/`, `frontend/src/components/insieme/`, `frontend/src/hooks/`                     | Pantallas del prototipo, tracker de estados, comprobante                    |
| Catálogo      | `backend/src/product/`, `backend/src/category/`, `backend/src/catalog/sync.ts`                     | Convenios y categorías en Postgres, sincronizados desde integration-backend |
| Facturas      | `backend/src/bill/service.ts`, `backend/src/bill/simulate.ts`, `backend/src/integration/client.ts` | Validación de referencia, snapshot del monto, fallback local                |
| Órdenes       | `backend/src/order/`, `backend/src/order-item/`                                                    | Precio autoritativo, estados y eventos                                      |
| Open Payments | `backend/src/open-payments/service.ts`, `backend/src/payment/service.ts`                           | Incoming y outgoing payments, grants, verificación del hash, poller         |
| Liquidación   | `backend/src/settlement/`                                                                          | Router de proveedores con failover, idempotencia                            |

## Decisiones

- **Un solo flujo de pago.** Servicios y facturas guardadas pasan por la misma orden, el mismo grant y el mismo tracker. No hay carrito.
- **El frontend nunca nombra al proveedor.** El campo `provider` solo sale en `GET /admin/orders`, la vista interna.
- **Fuente de verdad = incoming payment completado.** La liquidación se engancha al paso a `COMPLETED` en `PaymentService.complete()`. Un barrido reintenta órdenes `COMPLETED` sin liquidación.
- **Monto autoritativo en el servidor.** El cliente no decide el monto de una factura. El backend cobra el monto que obtuvo en la consulta (snapshot de 30 min). Para facturas libres (`kind: 'factura'`) el monto lo pone el cliente dentro de un rango, lo que se documenta como riesgo en [THREAT_MODEL.md](THREAT_MODEL.md).
- **Catálogo con respaldo.** El catálogo se sincroniza desde integration-backend cada 10 min y nunca borra filas (las órdenes las referencian). Si el integration-backend falla, se mantiene la semilla de `backend/data/catalog.json`.
- **Rutas de retorno fijas.** Open Payments vuelve a `/checkout/confirmation?orderId=` y, en el one-click, a `/cart/finish`. Las rutas se conservan del upstream.
