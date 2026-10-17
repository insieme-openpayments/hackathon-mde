# Insieme Frontend

SPA React 18 + Vite + Tailwind + react-query + valtio. Paquete `@insieme/frontend`.

Pantallas de Pago de servicios, Giro Efecty, Transferencia Bre-B y Facturas guardadas en React, migradas del prototipo Figma "Marca Blanca" (el prototipo estático se retiró del repo en el commit `a7ee705`; sigue en el historial (`ef76b86`)). La especificación de contratos está en [src/CONTRACTS.md](src/CONTRACTS.md).

## Scripts

Desde la raíz del repo (`pnpm --filter @insieme/frontend <script>`):

| Script    | Qué hace                                                                 |
| --------- | ------------------------------------------------------------------------ |
| `dev`     | Servidor de desarrollo de Vite (puerto 4004)                             |
| `build`   | Compila `shared`, comprueba tipos con `tsc` y construye con `vite build` |
| `preview` | Sirve el build de producción                                             |

## URLs

El portal vive bajo `/pay/` (Vite `base: "/pay/"`, router con `basename: "/pay"`) y la landing estática (`frontend/landing/`) en `/`:

- Landing: http://localhost:4004/
- Portal de pagos: http://localhost:4004/pay/

En desarrollo un plugin de Vite sirve `frontend/landing/` en `/`; en Docker lo hace nginx. Para assets públicos usa `publicUrl("assets/...")` de `src/lib/assets.ts`.

## Variables de entorno

Van en `frontend/.env.local` (en `.gitignore`). Plantilla: `frontend/.env.example`.

| Variable            | Descripción                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | URL del backend (por defecto `http://localhost:3004`)                       |
| `VITE_THEME`        | Tema (por defecto `light`; el diseño solo tiene tema claro)                 |
| `VITE_CURRENCY`     | Moneda de respaldo si `GET /config` falla; la moneda real viene del backend |

En despliegue, `window.__env__` (`API_BASE_URL`, `THEME`, `CURRENCY`) tiene prioridad sobre las variables de build.

## Rutas

| Ruta                                                                                                | Pantalla                                                                      |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/`                                                                                                 | Home con los productos: Pago de servicios, Giro Efecty y Transferencia Bre-B  |
| `/servicios`                                                                                        | Buscador, 12 categorías y tarjeta de Facturas                                 |
| `/servicios/categoria/:categoryId`                                                                  | Convenios de una categoría                                                    |
| `/servicios/pagar/:productId?ref1=`                                                                 | Pagar un servicio: consulta de referencia y confirmación                      |
| `/giros`                                                                                            | Giro Efecty: datos del destinatario, cotización de la comisión y confirmación |
| `/breb`                                                                                             | Transferencia Bre-B: llave, titular resuelto y confirmación                   |
| `/facturas`, `/facturas/nueva`, `/facturas/guardada`, `/facturas/:id/editar`, `/facturas/:id/pagar` | Facturas guardadas                                                            |
| `/checkout/confirmation`                                                                            | Vuelta de Open Payments: tracker del estado y comprobante                     |
| `/cart/finish`                                                                                      | Vuelta de la configuración de pago en un clic                                 |

Las rutas `/checkout/confirmation` y `/cart/finish` son fijas: el backend las envía a Open Payments.

## Estructura

- `src/app/`: pantallas por ruta.
- `src/components/insieme/`: componentes de la interfaz Insieme (tokens de marca en `src/main.css`).
- `src/components/payment/`: panel de confirmación y configuración de pago en un clic.
- `src/components/ui/`: primitivas (Radix + Tailwind).
- `src/hooks/`: consultas y mutaciones de react-query contra el backend.
- `src/lib/stores/`: estado persistido (borrador de pago, facturas guardadas, perfil, token).
- `src/lib/money.ts`, `src/lib/assets.ts`: formato de montos y recursos.
