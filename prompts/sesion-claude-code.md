# Prompts de la sesión con Claude Code (Claude Fable 5.1)

Registro literal de los mensajes enviados por el equipo a Claude Code para construir este
repositorio, en orden cronológico (16 de octubre de 2026). Los prompts que Claude Code generó
para sus subagentes (workflows) están en `prompts/workflows/`.

## 1. Fork inicial

> deseo un fork de el paquete boutique ubicado específicamente en https://github.com/interledger/testnet/tree/09dd1fb3cc77eff9e4b08f112be39a80f99d149d/packages/boutique porque deseo implementar una variante del boutique, pero luego le daremos identidad, inicialmente deseo una versión fork que funcione, luego vendran los demás ajustes.

## 2. Docker y verificación del flujo de pago

> Levanta back y front en docker, ejercita el flujo de pagos para verificar la conexión con la testnet interledger. Usa gsd-browser.

## 3. Reestructuración del repo

> Mueve las carpetas backend frontend y shared a la raiz, haciendo que la carpeta package no exista. Luego recrea el backend porque ya tiene los valores nuevos.

## 4. Pago desde otra wallet

> Obtuve https://wallet.interledger-test.dev/no-access?interactionId=62a97b16-0c3a-47de-985e-f8d4b4980a04&nonce=28B80B1F34F1FAF5 Access to the given resource is forbidden. El pago lo deseo hacer desde la wallet $ilp.interledger-test.dev/91b7c20f

## 5. Moneda y primer push

> El checkout de Opportunity cobró 1 Euro, hay un error en la UI porque el cobro es en COP, ajustar los montos adecuadamente. Luego sube todo el código al repo en main directamente.

## 6. Plan de migración de customer-frontend

> Haz pull, analiza el contenido de la carpeta customer-frontend, en ella está la propuesta de lo que será la plataforma, eso significa que se debe hacer un plan para migrar la experiencia que está en customer-frontend y que sea funcional en el frontend. Para hacer la adaptación del front/back, se debe cambiar las referencias de boutique a insieme (todo el codebase), y se debe hacer que los productos sean consumidos vía API (los que aparecen en el customer-frontend, json con tipo, convenio, requiere monto manual, después ajustamos el contrato). El propósito es que un usuario de Insieme pueda pagar vía Interledger las facturas/servicios que están disponibles vía API. Haz el plan, luego de la aprobación se implementa usando dynamic workflows, dejando la ejecución para agentes Sonet, Haiku, una orquestación y verificación con agente Opus, y una validación adversarial Fable (solo dos rondas).

Respuestas del equipo a las preguntas de Claude Code durante la planeación:

- Alcance de flujos: "Solo Servicios + Facturas".
- Wallet address: "El checkout debe presentar el ´One Click Buy Setup´ y el pago puede ser sin registro obligatorio ingresando la wallet en cada pago".
- Carrito: "Eliminar carrito, dejar one-click para después".

## 7. Mejoras desde hackathon-med y política de IA

> Analiza lo que está alojado en https://github.com/insieme-openpayments/hackathon-med/tree/main/hackathon-mde y con base en ello identifica oportunidades de mejora del plan definido. Ten presente para la ejecución lo definido en https://interledger.org/es/hackathon/ai-policy/

(El mensaje incluía pegado el texto de la Política de IA de los hackatones de Open Payments.)

Respuestas del equipo:

- Mejoras a incorporar: capa de liquidación con router de proveedores, factura enriquecida en el lookup, documentación de hackathon. Modo ensayo `SIMULATE_OP` descartado.
- Integración con `integration-backend` (repo del equipo): "Proveedor upstream con fallback".

## 8. Aprobación del plan

El plan completo generado por Claude Code se revisó y aprobó en la sesión; su contenido está
resumido en `docs/ARCHITECTURE.md` y los prompts de ejecución en `prompts/workflows/`.

## 9. Sincronización con los commits del equipo (durante la ejecución)

> Haz pull de los mas recientes commits, ya esta el contrato en un commit

> Haz nuevo pull, hay más cambios

Tras cada pull, Claude Code analizó los cambios del prototipo (`customer-frontend`) y del
repo `integration-backend` y ajustó el plan antes de lanzar los workflows (ver sección
"Ajustes de contrato" en `prompts/workflows/01-insieme-migration.js`).

## 10. Comandos ejecutados a mano por el equipo

Los archivos `.env.local` están bajo una regla de permisos que impide a Claude Code leerlos
o modificarlos. El rename de la base de datos lo ejecutó el equipo directamente en la terminal:

```sh
sed -i '' 's/boutique_backend/insieme_backend/g; s/Boutique/Insieme/g; s/boutique/insieme/g' backend/.env.example frontend/.env.example
sed -i '' 's/boutique_backend/insieme_backend/g' backend/.env.local
```

## 11. Ejecución de los workflows

Los dos workflows de `prompts/workflows/` se lanzaron desde esta misma sesión; sus scripts
contienen literalmente los prompts de cada subagente (Sonnet, Haiku, Opus y Fable). El
resultado de cada ronda se revisó en la sesión principal antes de hacer commit y push.

## 12. Identidad visual y limpieza de textos (17 oct 2026)

> Acabo de incluir isotipo-insieme.png y logo-insieme.webp para que lo analices y regeneres la UI
> con el look n feel apropiado. Requiero que la UI sea responsive, la UX fluida e intuitiva, con
> textos claros, elimina los textos que mencionan Davivienda, linea telefonica diferente a la 333...
> y la sección que tiene "Transacción procesada por" "Entidad financiera responsable"
> "Corresponsal de". Verifica que los textos largos se rendericen correctamente y en caso de
> existir logotipos que se presenten en proporciones adecuadas.

Manual de identidad enviado a continuación por el equipo (resumen literal):

> Logo horizontal de Insieme: ampersand y palabra insieme en amarillo sobre morado. Para portadas,
> encabezados, la diapositiva de cierre y cualquier lugar donde la marca deba leerse completa.
> Isotipo &: para espacios pequeños: los nodos de Insieme en los diagramas, el ícono de la app, el
> avatar en redes y el favicon.
> Concepto: Insieme significa "juntos" en italiano. El ampersand (&) es el signo de unir: el
> migrante y su familia, Interledger y Servicios locales, el exterior y Colombia.
> Color: Morado #7A1FA2, Amarillo #FFC20E, Aliados #137766.

Los archivos de marca (`frontend/public/brand/`) los aportó el equipo; Claude Code los recortó y
redimensionó (favicon, apple-touch-icon, logo del encabezado) y recortó el espacio en blanco de
los logos de convenios en `backend/images/convenios/`.

## 13. Productos nuevos en customer-frontend: Giro Efecty, Bre-B y pago real de servicios (17 oct 2026)

> Usando dyamic worflows y delegando a agentes:
>
> Trabaja en `customer-frontend/` (JS plano, sin build: `js/core.js` router y `App.ui`, pantallas en
> `js/screens/*.js` registradas con `App.register(nombre, {render, actions, mount})`, cliente HTTP en
> `js/api.js`). Hoy el único flujo conectado al backend es **Pago de servicios** (`js/screens/servicios.js`)
> usando `App.api.catalog()` y `App.api.validateService()`. Quiero habilitar dos productos nuevos,
> **Giro Efecty** y **Transferencia Bre-B**, consumiendo `integration-backend` (branch
> `feature/puntored-integration`, corre en `http://localhost:8000`, header `X-API-Key: insieme-dev-key`,
> base configurable con `?api=`). Conserva las convenciones del repo (Figma tokens en `css/styles.css`,
> un CSS por flujo, `App.flow` por flujo, `ui.stepper`, comprobante, "Ver detalles", `localStorage` solo
> para conveniencias).
>
> [Sigue la especificación completa del contrato de `integration-backend`: secciones "1. Descubrimiento
> de productos" (`GET /v1/products`), "2. Contrato de errores", "3. Giro Efecty (`/v1/efecty`)",
> "4. Transferencia Bre-B (`/v1/breb`)", "5. Pago de servicios (ya conectado; completa el pago)",
> "6. Qué implementar" (api.js, Home, pantallas efecty/breb, servicios.js con `payService`, mensajes
> de error, README) y la prueba manual con los seis casos. El texto íntegro está en
> `prompts/integration-backend-productos.md` (copia verbatim de `docs/prompts/frontend-productos.md`
> de `integration-backend`, commit 4ff9b65, que fue lo que se pegó en la sesión) y se pasó tal cual a
> los agentes como argumento `spec` del workflow `prompts/workflows/03-customer-frontend-productos.js`.]

## 14. Cambio de destino y retiro del prototipo (17 oct 2026)

> El contenedor ya tiene el fix, así que está disponible en el 8000 y los ajustes deberían estar en la
> página que ya tiene el look n feel insieme que se presenta en el puerto 4004

> Elimina el prototipo para evitar futuras confusiones

Con esto, Giro Efecty, Transferencia Bre-B y el pago real de servicios se implementan en la app React
(`frontend/` + `backend/`) y `customer-frontend/` se elimina del repo (su última versión está en el
commit `ef76b86`).
## 15. Traslado del portal a /pay y landing page (17 oct 2026)

> Al terminar, revisa el veredicto, haz commit y push ff, luego prepara otro workflow porque se debe
> crear una landing page, para eso todo el flujo se debe renderizar en el endpoint /pay de forma tal
> que la raiz sea usada por el sitio informativo. Primero verifica que el producto es funcional al
> moverlo fuera de la raiz y luego crea la landing page considerando:

[Sigue el brief completo de la landing (contexto y objetivo, reglas de contenido no negociables,
estructura de 8 secciones, los dos botones, seis personajes e historias, identidad visual y
requisitos técnicos, entregables y criterios de aceptación). Texto íntegro en
`prompts/landing-brief.md`; se pasó tal cual a los agentes del workflow
`prompts/workflows/05-pay-base-y-landing.js`.]
