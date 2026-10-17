# Prompt para hackathon-mde: consumir los productos de integration-backend

> Copia todo lo que sigue como prompt en una sesión de Claude Code abierta en el repo `hackathon-mde`.

---

Trabaja en `customer-frontend/` (JS plano, sin build: `js/core.js` router y `App.ui`, pantallas en `js/screens/*.js` registradas con `App.register(nombre, {render, actions, mount})`, cliente HTTP en `js/api.js`). Hoy el único flujo conectado al backend es **Pago de servicios** (`js/screens/servicios.js`) usando `App.api.catalog()` y `App.api.validateService()`. Quiero habilitar dos productos nuevos, **Giro Efecty** y **Transferencia Bre-B**, consumiendo `integration-backend` (branch `feature/puntored-integration`, corre en `http://localhost:8000`, header `X-API-Key: insieme-dev-key`, base configurable con `?api=`). Conserva las convenciones del repo (Figma tokens en `css/styles.css`, un CSS por flujo, `App.flow` por flujo, `ui.stepper`, comprobante, "Ver detalles", `localStorage` solo para conveniencias).

## 1. Descubrimiento de productos

`GET /v1/products` responde:

```json
{"products": [
  {"id":"services","name":"Pago de servicios","description":"...","enabled":true,"provider":"dummy","currency":"COP",
   "min_amount":1000,"max_amount":5000000,
   "fields":[{"name":"company_id","label":"Empresa o convenio","type":"string","required":true,"max_length":null,"help":null},
             {"name":"reference","label":"Referencia de pago","type":"string","required":true,"max_length":50,"help":null},
             {"name":"amount","label":"Valor a pagar","type":"number","required":true,"max_length":null,"help":null}],
   "endpoints":{"catalog":"/v1/catalog","companies":"/v1/catalog/companies","validate":"/v1/services/validate","pay":"/v1/services/pay","status":"/v1/services/transactions/{transaction_id}"}},
  {"id":"efecty","name":"Giro Efecty","description":"Giro de efectivo nacional para reclamar en un punto Efecty con la cédula","enabled":true,"provider":"mock","currency":"COP",
   "min_amount":10000,"max_amount":1500000,
   "fields":[{"name":"recipient_document","label":"Cédula del beneficiario","type":"document","required":true,"max_length":15},
             {"name":"recipient_name","label":"Nombre del beneficiario","type":"string","required":true,"max_length":80},
             {"name":"recipient_phone","label":"Celular para notificar","type":"phone","required":false,"max_length":15},
             {"name":"amount","label":"Monto del giro","type":"number","required":true}],
   "endpoints":{"quote":"/v1/efecty/quote","send":"/v1/efecty/transfers","status":"/v1/efecty/transfers/{transfer_id}"}},
  {"id":"breb","name":"Transferencia Bre-B","description":"Envío inmediato a la cuenta asociada a una llave Bre-B","enabled":true,"provider":"mock","currency":"COP",
   "min_amount":1000,"max_amount":5000000,
   "fields":[{"name":"key","label":"Llave Bre-B: celular, correo, documento o llave alfanumérica","type":"key","required":true,"max_length":64},
             {"name":"amount","label":"Monto","type":"number","required":true},
             {"name":"description","label":"Descripción","type":"string","required":false,"max_length":100}],
   "endpoints":{"resolve":"/v1/breb/keys/resolve","send":"/v1/breb/transfers","status":"/v1/breb/transfers/{transfer_id}"}}
]}
```

Usa `min_amount` / `max_amount` de esta respuesta para validar montos en el cliente (no los quemes en el código; déjalos como respaldo si el backend no responde). Los `fields` describen qué pedir al usuario; `type` puede ser `string | number | document | phone | email | key`.

## 2. Contrato de errores (todos los endpoints)

- Todas las rutas (salvo `/health`) exigen `X-API-Key`; sin ella responden `401`.
- Errores de negocio: `{"detail": "<texto en español para mostrar al usuario>"}` con `404`, `409`, `422`, `502`, `503` o `504`. Ejemplos: `422 {"detail":"El giro máximo es $1.500.000 COP"}`, `404 {"detail":"La llave Bre-B no existe o no está activa"}`.
- Errores de validación de tipos de pydantic (campo faltante o tipo incorrecto) llegan como `422` con `detail` **array**; `js/api.js` ya los convierte en `null` → muestra un mensaje genérico. Evítalos validando en el cliente que los campos requeridos vayan presentes y `amount` sea entero.

## 3. Giro Efecty (`/v1/efecty`)

Flujo de pantalla: Beneficiario (cédula, nombre, celular opcional) → Monto → Confirmación (cotización) → Resultado "disponible para reclamar".

**Request** (mismo body para quote y transfers):
```json
{"recipient_document":"1.020.304.050","recipient_name":"Ana Pérez","recipient_phone":"3001234567","amount":250000}
```
- `recipient_document`: 6 a 15 dígitos; el backend ignora puntos y espacios y lo devuelve normalizado (`"1020304050"`).
- `recipient_name`: 1 a 80 caracteres. `recipient_phone`: opcional, máximo 15.
- `amount`: entero en COP entre 10.000 y 1.500.000 (`422` con mensaje si se sale).

**`POST /v1/efecty/quote` → 200**
```json
{"amount":250000,"fee":0,"total":250000,"currency":"COP","max_amount":1500000,"min_amount":10000,
 "recipient_document":"1020304050","recipient_name":"Ana Pérez","message":"..."}
```
Muestra `amount`, `fee` y `total` en la confirmación (hoy `fee` es 0 pero debe renderizarse).

**`POST /v1/efecty/transfers` → 200** (crea el giro; el dinero queda disponible de inmediato)
```json
{"transfer_id":"EF-297948787150","status":"available","amount":250000,"fee":0,"total":250000,"currency":"COP",
 "recipient_document":"1020304050","recipient_name":"Ana Pérez","recipient_phone":"3001234567",
 "created_at":"2026-10-17T06:11:42.410151+00:00","expires_at":"2026-11-16T06:11:42.410151+00:00",
 "claim":{"method":"document","instructions":"Presenta tu cédula en cualquier punto Efecty del país para reclamar el giro.","network":"Efecty"},
 "message":"El dinero ya está disponible para ser reclamado en un punto Efecty."}
```
La pantalla de éxito debe mostrar `message`, `claim.instructions`, `transfer_id`, el beneficiario y `expires_at` formateado (vence a 30 días). `status` puede ser `available | claimed | expired` (hoy el mock solo devuelve `available`).

**`GET /v1/efecty/transfers/{transfer_id}` → 200** el mismo objeto; `404 {"detail":"El giro Efecty no existe"}`.

## 4. Transferencia Bre-B (`/v1/breb`)

Flujo de pantalla: Llave → (resolver llave y mostrar titular enmascarado + banco) → Monto y descripción → Confirmación → Resultado.

**`POST /v1/breb/keys/resolve`** body `{"key":"3001234567"}` → 200
```json
{"key":"3001234567","key_type":"phone","exists":true,"holder_name":"Va*** Fe***","bank":"Banco Mock Bre-B","message":"Llave Bre-B encontrada."}
```
- `key_type`: `phone` (10 dígitos que empiezan por 3) | `email` (contiene `@`) | `document` (6 a 15 dígitos) | `alphanumeric`.
- Llave inexistente → `404 {"detail":"La llave Bre-B no existe o no está activa"}`. **Debes resolver la llave y mostrar el titular ANTES de pedir el monto**; si es 404, muestra el error y no avances. Regla del mock: una llave que termina en `0` o en `A`/`a` no existe; cualquier otra existe.
- Llave vacía o mayor a 64 caracteres → `422` con `detail` texto.

**`POST /v1/breb/transfers`** body `{"key":"ana@correo.com","amount":150000,"description":"Arriendo"}` → 200
```json
{"transfer_id":"BB-593796481426","status":"completed","key":"ana@correo.com","key_type":"email","holder_name":"Ca*** To***",
 "bank":"Banco Mock Bre-B","amount":150000,"currency":"COP","description":"Arriendo",
 "created_at":"2026-10-17T06:11:42.631400+00:00","message":"Transferencia enviada a la cuenta asociada a la llave."}
```
- `amount`: entero en COP entre 1.000 y 5.000.000 (`422 {"detail":"El monto máximo por Bre-B es $5.000.000 COP"}`); `description` opcional, máximo 100.
- El backend vuelve a resolver la llave antes de aceptar: `404` con el mismo `detail` si no existe (no se crea nada).

**`GET /v1/breb/transfers/{transfer_id}` → 200** el mismo objeto; `404 {"detail":"Transferencia no encontrada"}`.

## 5. Pago de servicios (ya conectado; completa el pago)

Además de `validate`, el backend ya expone el pago. Úsalo en la confirmación del flujo de servicios en lugar de simular:

- `POST /v1/services/validate` body `{"company_id":"vanti","reference":"12345678"}` → 200
  `{"valid":true,"company_id":"vanti","company_name":"Vanti S.A. ESP","category":"gas","reference":"12345678","amount":264400,"currency":"COP","partial_allowed":true,"min_amount":1000,"max_amount":264400,"due_date":"2026-11-11","trace":null,"requires_amount":null,"message":null}`.
  Con `CATALOG_SOURCE=puntored` los ids son `pr-<agreementId>`, `due_date` es `null` (tolerarlo), `trace` viene con valor y `requires_amount` indica si el usuario digita el monto.
- `POST /v1/services/pay` body `{"trace":"<trace de validate o null>","company_id":"vanti","reference":"12345678","amount":264400,"client_ip":null}` → 200
  `{"status":"approved","transaction_id":1005334575,"authorization_code":"...","trace":"...","company_id":"vanti","reference":"12345678","amount":264400,"currency":"COP","date":"...","message":"...","ticket":null}`.
  `status` ∈ `approved | pending | rejected`. En modo dummy `trace` puede ser `null`: envía siempre `company_id`, `reference` y `amount`. Errores: `409` (rechazado o trace ya pagado, `detail` texto), `422`, `502`, `504` ("No se pudo confirmar el pago; consulta el estado por trace antes de reintentar": no reintentes automáticamente).
- `GET /v1/services/transactions/{transaction_id}` → `{"transaction_id":1005334575,"status":"EXITOSA","value":"9999.00","date":"...","trace":null}`; `404` si no existe.
- `GET /v1/catalog/companies?category=agua&q=acueducto&limit=50&offset=0` → `{"count":<ítems de la página>,"total":<total>,"items":[...]}`. En modo PuntoRed `/v1/catalog` solo trae las empresas de las categorías visibles; `administracion` y `otros` se buscan con este endpoint.

## 6. Qué implementar

1. `js/api.js`: agregar `products()`, `efectyQuote(body)`, `efectySend(body)`, `efectyGet(id)`, `brebResolve(key)`, `brebSend(body)`, `brebGet(id)`, `payService(body)`, `serviceTransaction(id)`, `companies(params)`. Mantener `ApiError` y el manejo de `detail`.
2. Home (`js/screens/onboarding.js`, arreglo de productos cerca de la línea 95): agregar las tarjetas "Giro Efecty" y "Bre-B" (íconos nuevos en `assets/icons/`, estilo de las existentes). Si `GET /v1/products` responde, usa `enabled` para ocultar productos deshabilitados; si no responde, muestra las tarjetas con los datos locales de respaldo.
3. Nuevas pantallas `js/screens/efecty.js` (`#efecty`) y `js/screens/breb.js` (`#breb`) con sus CSS, siguiendo el patrón de `recargas.js`/`servicios.js` (stepper, teclado de monto con formato `$ 250.000`, confirmación con "Ver detalles", comprobante). Validar en cliente: cédula solo dígitos (6-15, aceptar puntos), montos dentro de `min_amount`/`max_amount` del producto, llave no vacía.
4. En `servicios.js`, reemplazar la simulación del pago por `payService` y mostrar `transaction_id`/`status` en el comprobante; tolerar `due_date: null`.
5. Mensajes de error: mostrar `e.detail` cuando exista; si es `null` (error de tipos o de red), un mensaje genérico por flujo.
6. Actualizar `customer-frontend/README.md` (tabla de flujos con `#efecty` y `#breb`, y la nota de que consume `integration-backend`).

Prueba manual: backend con `.venv/bin/uvicorn app.main:app --port 8000` en `integration-backend`; frontend con `python3 -m http.server 8080` en `customer-frontend`. Casos: giro de 250.000 a la cédula 1.020.304.050 (éxito), giro de 2.000.000 (error de máximo), llave `3001234567` (existe), llave `3001234560` (no existe), transferencia de 150.000 a `ana@correo.com`, transferencia de 6.000.000 (error de máximo).
