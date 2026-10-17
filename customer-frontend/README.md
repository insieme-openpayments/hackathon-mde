# Marca Blanca · Prototipo funcional

Experiencia navegable del Figma **🇨🇴 Marca Blanca → "Versión para DEMOS - Marca Blanca"**
(`8KzkVdCLxxBPAo1UuFlNPI`, nodo `2017:4533`).

## Cómo abrirlo
Doble clic en `index.html` (no requiere servidor ni build). Para publicarlo, sube la carpeta tal cual (Netlify drop, GitHub Pages, etc.).

- En escritorio se muestra el teléfono (320×568 escalado) con un menú **Demo** debajo para saltar a cada flujo.
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
| Facturas guardadas | `#facturas` | `js/screens/facturas.js` |

## Estructura
- `js/core.js` — router, estado (`App.state` global, `App.flow` por flujo) y componentes compartidos (`App.ui`: logo, botones, back, tooltip, stepper, contenedor inferior "Ver detalles", comprobante…).
- `css/styles.css` — tokens del Figma (colores Foundation, Roboto) y componentes base. Cada flujo tiene su CSS propio.
- `assets/` — íconos e imágenes exportados del Figma.

Depuración: `index.html?go=<pantalla>&flow=<json>` abre cualquier pantalla con estado precargado, p. ej.
`index.html?go=recargas-valor&flow={"operator":"tigo","amountText":"2.000","phone":"3022087223","sheetOpen":true}`.

Notas: "Gilroy" (botones) se reemplaza por Figtree (Google Fonts). Los datos (operadores, paquetes, pines, empresas, facturas) son simulados; las facturas guardadas persisten en `localStorage`.
