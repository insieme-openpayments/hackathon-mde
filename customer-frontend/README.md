# Marca Blanca · Prototipo funcional

Experiencia navegable del Figma **🇨🇴 Marca Blanca → "Versión para DEMOS - Marca Blanca"**
(`8KzkVdCLxxBPAo1UuFlNPI`, nodo `2017:4533`).

## Cómo abrirlo
Doble clic en `index.html` (no requiere servidor ni build). Para publicarlo, sube la carpeta tal cual (Netlify drop, GitHub Pages, etc.).

Con servidor local, desde la raíz del repo:

```bash
cd customer-frontend && python3 -m http.server 8080
```

Los flujos **Pago de servicios**, **Giro Efecty** y **Transferencia Bre-B** consumen [integration-backend](https://github.com/insieme-openpayments/integration-backend) (productos `/v1/products`, catálogo y validación/pago de servicios, cotización y envío de giros Efecty, resolución de llaves y envío Bre-B) con la API key de demo (`X-API-Key: insieme-dev-key`, en `js/api.js`). Por defecto apunta a `http://localhost:8000`; otra URL: `?api=http://host:puerto`. La Home consulta `/v1/products` y oculta los productos con `enabled: false`; si el servidor no responde, usa los datos locales de respaldo.

Luego abre http://localhost:8080 (inicia en `#home`; usa `#recargas`, `#pines`, `#tyc`… para saltar a cada flujo).

- En escritorio se muestra el teléfono (320×568 escalado).
- En móvil ocupa toda la pantalla.

## Flujos
| Flujo | Ruta | Archivo |
|---|---|---|
| Registro + Términos y condiciones / Política | `#tyc` | `js/screens/onboarding.js` |
| Productos disponibles (Home) | `#home` | `js/screens/onboarding.js` |
| Recargas | `#recargas` | `js/screens/recargas.js` |
| Paquetes | `#paquetes` | `js/screens/paquetes.js` |
| Pines y entretenimiento | `#pines` | `js/screens/pines.js` |
| Pago de servicios | `#servicios` | `js/screens/servicios.js` |
| Giro Efecty | `#efecty` | `js/screens/efecty.js` |
| Transferencia Bre-B | `#breb` | `js/screens/breb.js` |
| Facturas guardadas | `#facturas` | `js/screens/facturas.js` |

## Pruebas manuales (con el backend arriba)
Abre `index.html?api=http://127.0.0.1:8001#home` (ajusta el puerto). Casos:
- Giro Efecty de 250.000 a la cédula 1.020.304.050: éxito ("disponible para reclamar").
- Giro Efecty de 2.000.000: error de máximo ($1.500.000).
- Bre-B con la llave `3001234567`: existe (muestra titular enmascarado y banco).
- Bre-B con la llave `3001234560`: no existe; muestra el error y no avanza.
- Bre-B de 150.000 a `ana@correo.com`: éxito.
- Bre-B de 6.000.000: error de máximo ($5.000.000).
- Pago de servicios (p. ej. Vanti, referencia 12345678): comprobante con `transaction_id` y estado.

## Estructura
- `js/core.js` — router, estado (`App.state` global, `App.flow` por flujo) y componentes compartidos (`App.ui`: logo, botones, back, tooltip, stepper, contenedor inferior "Ver detalles", comprobante…).
- `css/styles.css` — tokens del Figma (colores Foundation, Roboto) y componentes base. Cada flujo tiene su CSS propio.
- `assets/` — íconos e imágenes exportados del Figma.

Depuración: `index.html?go=<pantalla>&flow=<json>` abre cualquier pantalla con estado precargado, p. ej.
`index.html?go=recargas-valor&flow={"operator":"tigo","amountText":"2.000","phone":"3022087223","sheetOpen":true}`.

Notas: "Gilroy" (botones) se reemplaza por Figtree (Google Fonts). Los datos (operadores, paquetes, pines, empresas, facturas) son simulados; las facturas guardadas persisten en `localStorage`.
