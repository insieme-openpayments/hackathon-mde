# Modelo de amenazas (resumen)

| Amenaza | Mitigación | Estado |
|---|---|---|
| Inyección de `interact_ref` ajeno en el callback | Verificación del `hash` GNAP (SHA-256 de nonces + ref + endpoint) | Hecho + test |
| Replay del callback | La orden solo acepta el redirect en `awaiting_approval` | Hecho + test |
| Doble pago al corresponsal | `idempotencyKey = incomingPayment.id`; reconcile con promesa compartida | Hecho + test |
| Manipular el monto desde el cliente | Reconsulta de factura en servidor | Hecho |
| Grant robado / pagador debita de más | Límite `debitAmount` = quote; token de vida corta | Hecho (por diseño del protocolo) |
| Liberar pago sin fondos | Solo se libera con incoming `completed` / `receivedAmount >= incomingAmount` | Hecho |
| Caída del proveedor | Failover entre adaptadores | Hecho + test |
| Llaves en el repo | `.gitignore` (`*.key`, `.env`); `.env.example` sin secretos | Hecho |
| Persistencia, auth de usuario, rate limiting, reembolso automático | — | Pendiente |
