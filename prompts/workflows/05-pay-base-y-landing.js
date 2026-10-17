// Workflow 5: traslado del portal de pagos a /pay (compuerta Opus con pago real) y landing informativa en la raíz.
// pay-base (Sonnet) -> compuerta Opus (+ fixers Sonnet) -> landing-page e ilustracion (Sonnet, en paralelo) -> verificación Opus de los criterios del brief (+ fixers Sonnet).
// args: { repo }. El brief se lee desde prompts/landing-brief.md.

export const meta = {
  name: 'pay-base-y-landing',
  description: 'Mover el portal de pagos Insieme a /pay (verificado con un pago real) y crear la landing informativa en la raíz',
  phases: [
    { title: 'Base /pay', detail: 'Vite base, router basename, assets, nginx, Dockerfile, URLs de retorno' },
    { title: 'Compuerta /pay', detail: 'Opus: build, docker, recorrido y pago real volviendo a /pay/checkout/confirmation' },
    { title: 'Landing', detail: 'página estática en la raíz + avatares SVG, en paralelo' },
    { title: 'Verificación', detail: 'Opus: criterios de aceptación del brief, fixers Sonnet' },
  ],
}

const REPO = args.repo

const PREAMBLE = `Repo: ${REPO} (pnpm monorepo: backend/ Express, shared/, frontend/ React 18 + Vite 5 + Tailwind + react-router 6 (createBrowserRouter en frontend/src/app/index.tsx), local/ docker compose). pnpm NO está en PATH: usa "npx -y pnpm@9.1.4 <cmd>" desde la raíz. Comandos: build, checks (prettier + eslint --max-warnings=0), test (backend, jest + testcontainers), docker:up (reconstruye y levanta insieme-postgres :15434, insieme-backend :3004, insieme-frontend :4004). Formatea con "npx -y pnpm@9.1.4 prettier --config .prettierrc.js --write <archivos>".
Cómo se sirve hoy el frontend: frontend/Dockerfile.prod construye con Vite y copia frontend/dist a /usr/share/nginx/html; frontend/nginx/nginx.conf sirve la SPA con try_files -> /index.html en el puerto 4004; frontend/docker-entrypoint.sh escribe /usr/share/nginx/html/env.js (window.__env__ con API_BASE_URL, THEME, CURRENCY) y frontend/index.html lo carga con <script src="/env.js">. Los assets públicos se referencian con rutas absolutas ("/assets/...", "/brand/...", "/favicon.png") en ~12 archivos de frontend/src y en index.html. El backend construye las URLs de retorno de Open Payments con env.FRONTEND_URL: FRONTEND_URL + "/checkout/confirmation?orderId=" y FRONTEND_URL + "/cart/finish?identifier=" (backend/src/open-payments/service.ts) y usa new URL(FRONTEND_URL).origin para CORS (backend/src/app.ts). En local/docker-compose.app.yml el backend recibe FRONTEND_URL (default http://localhost:4004) y el frontend API_BASE_URL (default http://localhost:3004). backend/.env.local y cualquier .env* están PROHIBIDOS (no leer, no escribir); backend/.env.example sí se puede editar.
Identidad Insieme: morado #7A1FA2, amarillo #FFC20E (acción), verde aliados #137766; logo horizontal frontend/public/brand/logo-insieme.png (recorte con fondo morado) y logo-insieme-full.webp, isotipo frontend/public/brand/isotipo-insieme.png (512) e isotipo-insieme-2000.png, favicon frontend/public/favicon.png. Prohibido en cualquier texto, alt, metadato o imagen de la landing: "PuntoRed" (y "Puntored"), "Davivienda", cifras/tarifas/tiempos no validados. Billetera de pruebas verificada: $ilp.interledger-test.dev/91b7c20f (EUR; cada pago real gasta saldo: usa el monto mínimo). Para curl usa 127.0.0.1. gsd-browser: solo lo usan los verificadores Opus (viewport: navega, set-viewport --width/--height, reload). No hagas commits. Devuelve el JSON pedido.
BRIEF DE LA LANDING (léelo completo antes de escribir): ${REPO}/prompts/landing-brief.md
`

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    openIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'filesChanged', 'openIssues'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    defects: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, claim: { type: 'string' }, severity: { type: 'string' } }, required: ['file', 'claim', 'severity'] } },
    evidence: { type: 'array', items: { type: 'string' } },
    remaining: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'defects', 'evidence', 'remaining'],
}

const PAY_DESIGN = `DISEÑO DEL TRASLADO A /pay (fijo):
- Vite: base '/pay/' en frontend/vite.config.ts. Router: createBrowserRouter(routes, { basename: '/pay' }). Las rutas internas (Link/navigate con '/servicios', '/giros', ...) NO cambian: react-router resuelve con el basename.
- Assets públicos: helper publicUrl(path) en frontend/src/lib/assets.ts que antepone import.meta.env.BASE_URL (sin doble barra) y reemplazo de TODAS las referencias absolutas "/assets/...", "/brand/...", "/favicon.png" en frontend/src por publicUrl('assets/...'); en index.html usa rutas relativas o deja que Vite las reescriba con base (verifica en frontend/dist/index.html que favicon, apple-touch-icon y env.js apuntan a /pay/...). env.js: index.html carga env.js relativo a la base; el entrypoint lo escribe en /usr/share/nginx/html/pay/env.js.
- nginx (frontend/nginx/nginx.conf): location /pay/ sirve la SPA desde /usr/share/nginx/html/pay con try_files $uri $uri/ /pay/index.html; location = /pay/env.js con no-store; location / sirve la landing estática desde /usr/share/nginx/html (try_files $uri $uri/ /index.html); cache de estáticos como hoy. Redirección 301 de /pay a /pay/.
- Dockerfile.prod: dist -> /usr/share/nginx/html/pay ; frontend/landing/ -> /usr/share/nginx/html/ (hasta que exista la landing, crea frontend/landing/index.html mínimo con el logo, el texto "Insieme" y un enlace "Ir al portal de pagos" a /pay/, para que la raíz responda 200).
- Dev: en vite.config.ts añade un plugin pequeño (configureServer) que sirva frontend/landing/ en "/" (index.html y archivos) y deje /pay/ a Vite; documenta en frontend/README.md que el portal vive en http://localhost:4004/pay/ y la landing en http://localhost:4004/.
- Backend: FRONTEND_URL pasa a incluir el prefijo: default en local/docker-compose.app.yml http://localhost:4004/pay y en backend/.env.example; app.ts sigue usando .origin para CORS (verifica que funciona con el path). Si prefieres, añade FRONTEND_BASE_PATH; pero la solución mínima es FRONTEND_URL con /pay.
- README.md raíz: sección "Correr" con las dos URLs y la nota de que FRONTEND_URL debe terminar en /pay (el equipo debe actualizar backend/.env.local a mano para pnpm dev: FRONTEND_URL=http://localhost:4004/pay).`

phase('Base /pay')
const base = await agent(`${PREAMBLE}
${PAY_DESIGN}
TU ROL: pay-base (Sonnet). Implementa el diseño completo. Archivos: frontend/vite.config.ts, frontend/src/app/index.tsx, frontend/src/lib/assets.ts y todos los .tsx/.ts con referencias absolutas a assets (grep -rn '"/assets/\\|\\x27/assets/\\|"/brand/\\|\\x27/brand/\\|/favicon' frontend/src), frontend/index.html, frontend/nginx/nginx.conf, frontend/Dockerfile.prod, frontend/docker-entrypoint.sh, frontend/landing/index.html (placeholder), local/docker-compose.app.yml, backend/.env.example, README.md, frontend/README.md, backend/README.md si menciona FRONTEND_URL. Verifica: npx -y pnpm@9.1.4 build && checks; grep en frontend/dist/index.html de las rutas /pay/; npx -y pnpm@9.1.4 docker:up y curl -s -o /dev/null -w '%{http_code}' a http://127.0.0.1:4004/ (200 landing placeholder), /pay/ (200 SPA), /pay/servicios (200 SPA), /pay/assets/icons/cat-pago-servicios.svg (200), /pay/env.js (200 con API_BASE_URL), /pay/brand/logo-insieme.png (200). Devuelve summary, filesChanged, openIssues.`, {
  label: 'pay-base', phase: 'Base /pay', model: 'sonnet', schema: RESULT_SCHEMA,
})
log('pay-base: ' + base.summary.slice(0, 200))

phase('Compuerta /pay')
const GATE_CASES = `COMPUERTA /pay (Opus). Con el stack Docker levantado (npx -y pnpm@9.1.4 docker:up; el backend Docker apunta a integration-backend en host.docker.internal:8000, el contenedor del equipo en modo PuntoRed; si no responde usa INTEGRATION_API_URL=http://host.docker.internal:8001 que es el mock):
1. curl: / 200 (placeholder), /pay 301->/pay/, /pay/ 200, /pay/giros 200 (SPA), /pay/env.js 200 con API_BASE_URL, /pay/assets/... 200, /pay/brand/logo-insieme.png 200; en el HTML de /pay/ no quedan referencias a "/assets/" o "/env.js" sin el prefijo.
2. gsd-browser 390x844 en http://localhost:4004/pay/: Home con logo e iconos cargados (ninguna imagen rota: comprueba naturalWidth > 0 de todos los <img>), navegación Home -> Pago de servicios -> categoría -> empresa -> consultar (referencia válida) -> panel; Home -> Giro Efecty -> paso 1 y 2; Home -> Bre-B -> consultar llave 3001234567. Sin errores en consola salvo los esperados.
3. UN pago real mínimo (Giro Efecty 10.000 COP o la opción más barata disponible) con la billetera $ilp.interledger-test.dev/91b7c20f: la billetera debe redirigir de vuelta a http://localhost:4004/pay/checkout/confirmation?orderId=... (no a la raíz), el PATCH se ejecuta, el tracker avanza y la orden llega a SETTLED (GET :3004/orders/:id). Si la liquidación falla por el upstream, documenta pero el criterio de esta compuerta es el retorno correcto a /pay/.
4. One-click: desde el panel abre "Configurar pago en un clic" y verifica que la URL de finishUrl generada por el backend (en el redirect a la billetera o en los logs del contenedor insieme-backend) contiene /pay/cart/finish.
5. npx -y pnpm@9.1.4 build && checks && test verdes.
Devuelve {pass, defects[], evidence[], remaining[]}. Corrige tú lo pequeño; lista lo demás.`
let gate = await agent(`${PREAMBLE}
${PAY_DESIGN}
Eres el verificador (Opus) de la compuerta /pay. Resultado de pay-base: ${JSON.stringify(base)}.
${GATE_CASES}`, {
  label: 'gate-pay', phase: 'Compuerta /pay', model: 'opus', schema: VERIFY_SCHEMA,
})
for (let round = 1; !gate.pass && gate.defects.length && round <= 2; round++) {
  log(`Compuerta /pay: ronda de fixes ${round} (${gate.defects.length} defectos)`)
  await agent(`${PREAMBLE}
${PAY_DESIGN}
Eres el fixer (Sonnet, ronda ${round}) del traslado a /pay. Corrige TODOS estos defectos sin romper build/checks/test; verifica con curl y docker:up (sin gsd-browser). Defectos: ${JSON.stringify(gate.defects)}`, {
    label: `fix-pay:${round}`, phase: 'Compuerta /pay', model: 'sonnet', schema: RESULT_SCHEMA,
  })
  gate = await agent(`${PREAMBLE}
${PAY_DESIGN}
Eres el verificador (Opus), re-verificación de la compuerta /pay tras la ronda ${round}. Defectos que debían corregirse: ${JSON.stringify(gate.defects)}. Re-ejecuta la compuerta (puedes omitir el pago real si ya pasó y no cambió código del retorno; indícalo en evidence).
${GATE_CASES}`, {
    label: `gate-pay:${round}`, phase: 'Compuerta /pay', model: 'opus', schema: VERIFY_SCHEMA,
  })
}
if (!gate.pass) {
  log('La compuerta /pay no pasó; se detiene antes de la landing')
  return { base, gate, landing: null, verdict: null }
}

phase('Landing')
const LANDING_DESIGN = `DISEÑO DE LA LANDING (fijo; HTML estático sin build, publicable tal cual):
- Carpeta frontend/landing/: index.html, styles.css, script.js (mínimo: selector de escenarios accesible con botones/aria-expanded, toggle opcional de tema con localStorage y respeto de prefers-color-scheme, FAQ con <details>), assets/ (avatares SVG: marcela.svg, samuel.svg, andres.svg, daniela.svg, dona-rosa.svg, don-alvaro.svg; iconos de línea SVG: wallet.svg, interledger.svg, breb.svg, corresponsal.svg, servicios.svg; puente.svg (visual del puente de intermediarios); og.svg y og.png NO: la imagen Open Graph es assets/og.svg referenciada como og:image absoluta relativa al host, y además un og.png de 1200x630 generado con sips desde un SVG si es posible; si no, documenta); brand/ (copia de logo-insieme.png, logo-insieme-full.webp e isotipo-insieme.png desde frontend/public/brand; favicon.png y apple-touch-icon.png copiados desde frontend/public). Rutas relativas (./assets/...), para que funcione servida en la raíz por nginx y por el plugin de Vite en dev.
- Tokens CSS en :root (--brand #7A1FA2, --accent #FFC20E, --allies #137766, --ink #1A1D24, --bg #F6F6F2, superficies, bordes) y tema oscuro con los mismos tokens bajo @media (prefers-color-scheme: dark) y [data-theme="dark"] / [data-theme="light"]. Fuentes Sora (500-700) y Manrope (400-700) desde Google Fonts con preconnect y display=swap.
- Estructura exacta de las 8 secciones del brief, en ese orden, con ids: hero, problema, que-es, formas, historias, empezar, confianza, cierre. Sticky bar móvil con los dos botones (visible bajo 768 px), ambos botones visibles sin scroll en 360x640 (hero compacto). Botón primario "Ir al portal de pagos" -> ./pay/ (amarillo sobre morado, con icono de flecha además del color); secundario "Crear mi wallet Interledger" -> https://wallet.interledger-test.dev/ target="_blank" rel="noopener" (contorno, con icono de wallet), con la línea "Tu billetera para pagar en cualquier moneda" y el aviso de entorno de pruebas (demostración, no mueve dinero real).
- Contenido: textos finales en español de Colombia, tuteo, sin jerga; bloque opcional "Para quien quiere saber más" en un <details> con Open Payments e ILP. Nota "Historia ilustrativa basada en situaciones frecuentes de familias con migrantes" en cada historia y en el pie. Aliados: Intrust, Twelve Network y Oplat como texto estilizado (sin logos externos). Contexto: nace en Beyond Access 2026, hackatón de Interledger.
- Accesibilidad: landmarks (header/nav/main/section con aria-labelledby/footer), un solo h1, jerarquía h2/h3, alt descriptivo en cada avatar e ilustración (sin nombrar redes), foco visible (outline con --accent), skip link, contraste AA (texto sobre morado en blanco o amarillo #FFC20E solo para botones con texto morado oscuro), prefers-reduced-motion desactiva animaciones.
- SEO: <title>, meta description, og:title/description/image/type/url, twitter:card, lang="es-CO", canonical relativa; sin "PuntoRed" en ninguna parte.
- Rendimiento: solo SVG inline o externos, CSS < 40 KB, JS < 10 KB, sin frameworks.`

const landing = await parallel([
  () => agent(`${PREAMBLE}
${LANDING_DESIGN}
TU ROL: landing-page (Sonnet). Escribe frontend/landing/index.html, styles.css y script.js completos según el brief y el diseño (los avatares e iconos los crea en paralelo el agente de ilustración con EXACTAMENTE los nombres de archivo listados; referencia esos nombres y usa width/height fijos en los <img>: avatares 96x96, iconos 32x32). Copia brand/ y favicons desde frontend/public. Reemplaza el placeholder actual de frontend/landing/index.html. Revisa el resultado sirviéndolo (cd frontend/landing && python3 -m http.server 8090) con curl y, si quieres, con gsd-browser NO (reservado al verificador). Valida HTML con una pasada manual (etiquetas cerradas, ids únicos, enlaces correctos) y pasa prettier. Devuelve summary, filesChanged y openIssues.`, {
    label: 'landing-page', phase: 'Landing', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${LANDING_DESIGN}
TU ROL: ilustracion (Sonnet). Crea en frontend/landing/assets/ los SVG: seis avatares circulares (viewBox 0 0 160 160, fondo circular de color suave distinto por familia, estilo plano y cálido, rasgos simples pero diferenciados: Marcela 34 auxiliar de enfermería con uniforme, Samuel 9 niño con morral, Andrés 28 repartidor con casco de bici, Daniela 19 universitaria con audífonos, Doña Rosa 67 abuela con gafas y moño, Don Álvaro 58 tendero con delantal; sin texto, sin marcas), cinco iconos de línea 24x24 (stroke currentColor, 1.75 px, round): wallet.svg, interledger.svg (nodos conectados), breb.svg (rayo/transferencia instantánea), corresponsal.svg (tienda de barrio), servicios.svg (recibo), más puente.svg (ilustración horizontal 600x200 del "puente de intermediarios" que se elimina: varios nodos grises tachados vs. una línea directa morada con el ampersand) y og.svg (1200x630, logo &insieme y el titular "Paga en Colombia desde donde estés. Tu familia lo recibe cerca de casa.", fondo morado). Si sips puede rasterizar og.svg a og.png 1200x630 hazlo; si no, déjalo en openIssues. Cada SVG con <title> descriptivo. Nombres EXACTOS: marcela.svg, samuel.svg, andres.svg, daniela.svg, dona-rosa.svg, don-alvaro.svg, wallet.svg, interledger.svg, breb.svg, corresponsal.svg, servicios.svg, puente.svg, og.svg. Valida que cada archivo es XML bien formado (python3 -c "import xml.dom.minidom,sys; [xml.dom.minidom.parse(f) for f in sys.argv[1:]]" ...). Devuelve summary, filesChanged, openIssues.`, {
    label: 'ilustracion', phase: 'Landing', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
])
const landingDone = landing.filter(Boolean)

phase('Verificación')
const LANDING_CASES = `CRITERIOS DE ACEPTACIÓN (Opus; gsd-browser; sirve el stack con npx -y pnpm@9.1.4 docker:up y usa http://localhost:4004/ ; también comprueba en dev que "npx -y pnpm@9.1.4 --filter @insieme/frontend dev" sirve / y /pay/ si el plugin existe, o documenta):
1. 360x640: hero con h1 y los DOS botones visibles sin scroll (bounding rect dentro del viewport) y distinguibles sin color (icono/contorno); sticky bar móvil visible; 1280x900: layout de escritorio sin desbordes.
2. Secciones 1-8 presentes en orden con sus ids; el selector de la sección 4 distingue "Pago la obligación directamente" y "Le envío dinero a mi familiar" con sub-opciones Bre-B y giro en efectivo; cada tarjeta con botón de pago a ./pay/.
3. Seis personajes con avatar (naturalWidth>0), historia "Lo que vivieron" / "Con Insieme" y la nota de historia ilustrativa.
4. grep -ri "puntored\\|davivienda" frontend/landing -> 0 resultados; sin cifras/tarifas/tiempos garantizados (busca %, "sin comisión", "días", "minutos" y evalúa).
5. Botón wallet: href https://wallet.interledger-test.dev/, target _blank, rel con noopener, aviso de entorno de pruebas junto a él. Botón primario lleva a /pay/ y la SPA carga.
6. Modo oscuro: con prefers-color-scheme dark (gsd-browser eval matchMedia + atributo data-theme si hay toggle) los tokens cambian y el contraste se mantiene; prefers-reduced-motion respetado en CSS.
7. Accesibilidad: un h1, landmarks, alt en todas las <img>, foco visible al tabular, skip link; contraste AA en textos principales (evalúa colores computados).
8. SEO: title, meta description, og:image resoluble (200), lang es-CO. Rendimiento: peso total de la landing < 300 KB sin fuentes (suma de archivos transferidos).
9. Portal: /pay/ sigue funcionando (Home, un recorrido corto) tras los cambios; npx -y pnpm@9.1.4 build && checks && test verdes.
Devuelve {pass, defects[], evidence[], remaining[]}; corrige lo pequeño tú.`
let verdict = await agent(`${PREAMBLE}
${LANDING_DESIGN}
Eres el verificador (Opus). Resultados: ${JSON.stringify(landingDone.map(r => ({ summary: r.summary, files: r.filesChanged, openIssues: r.openIssues })))}. Primero resuelve inconsistencias entre la página y los assets (nombres, tamaños, alt). Luego aplica los criterios.
${LANDING_CASES}`, {
  label: 'verify-landing', phase: 'Verificación', model: 'opus', schema: VERIFY_SCHEMA,
})
for (let round = 1; !verdict.pass && verdict.defects.length && round <= 2; round++) {
  log(`Landing: ronda de fixes ${round} (${verdict.defects.length} defectos)`)
  await agent(`${PREAMBLE}
${LANDING_DESIGN}
Eres el fixer (Sonnet, ronda ${round}) de la landing. Corrige TODOS estos defectos (sin gsd-browser; valida con curl, grep y revisión del HTML/CSS). Defectos: ${JSON.stringify(verdict.defects)}`, {
    label: `fix-landing:${round}`, phase: 'Verificación', model: 'sonnet', schema: RESULT_SCHEMA,
  })
  verdict = await agent(`${PREAMBLE}
${LANDING_DESIGN}
Eres el verificador (Opus), re-verificación de la landing tras la ronda ${round}. Defectos que debían corregirse: ${JSON.stringify(verdict.defects)}. Re-aplica todos los criterios.
${LANDING_CASES}`, {
    label: `verify-landing:${round}`, phase: 'Verificación', model: 'opus', schema: VERIFY_SCHEMA,
  })
}

return { base: base.summary, gate, landing: landingDone.map(r => ({ summary: r.summary, files: r.filesChanged, openIssues: r.openIssues })), verdict }
