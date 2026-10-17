// Workflow 3: Giro Efecty, Transferencia Bre-B y pago real de servicios en customer-frontend (JS plano).
// Ejecutores Sonnet por archivo (api, efecty, breb, servicios, home), verificación Opus con gsd-browser y hasta dos rondas de fixers Sonnet.
// args: { repo, spec: "<prompt del usuario, sección 13 de prompts/sesion-claude-code.md>" }

export const meta = {
  name: 'customer-frontend-productos',
  description: 'Giro Efecty, Transferencia Bre-B y pago real de servicios en customer-frontend (JS plano) contra integration-backend',
  phases: [
    { title: 'API', detail: 'js/api.js: nuevos métodos del cliente' },
    { title: 'Pantallas', detail: 'efecty, breb, servicios (pago real), home + registro' },
    { title: 'Verificación', detail: 'Opus: recorrido con gsd-browser, fixers Sonnet' },
  ],
}

const SPEC = args.spec
const REPO = args.repo
const FE = REPO + '/customer-frontend'

const PREAMBLE = `Repo: ${REPO}. Trabajas SOLO dentro de ${FE} (prototipo en JS plano, sin build).
Convenciones que debes conservar (léelas en el código antes de escribir):
- js/core.js: router (App.register(nombre, {render, actions, mount}), App.go/back/reset, App.flow por flujo, App.later, App.entries) y componentes App.ui (logo, btn, backBtn, stepTitle, tip, field, rows, stepper, sheet "Ver detalles", pasarela, finishLink, money/num/digits/esc/now/rand). Las pantallas se registran por nombre y se navegan con el hash (#efecty).
- js/screens/recargas.js y js/screens/servicios.js son los patrones de referencia (stepper, teclado de monto con formato "$ 250.000" vía ui.num/ui.digits, sheet con rows + primary, pasarela 2,2 s, comprobante con ui.rows y ui.finishLink). servicios.js define input2 (input con etiqueta flotante) y un patrón async (startConsult) que comprueba "App.flow !== f" tras el await para ignorar respuestas de una pantalla abandonada.
- css/styles.css tiene los tokens (--blue-normal, --lime, --primary, --success, .err, .btn, .sheet, .receipt-rows, .kv). Un CSS por flujo con prefijo propio (sv- en servicios.css, rc- en recargas). Dispositivo de 320x568: todo debe caber o scrollear con data-scroll.
- js/api.js: cliente con ApiError(status, detail); detail string se expone, detail array (pydantic) -> null. Base configurable con ?api=. Header X-API-Key: insieme-dev-key.
- localStorage solo para conveniencias. Nada de frameworks ni build.
Entorno de prueba YA LEVANTADO: integration-backend (rama feature/puntored-integration, modo dummy/mock) en http://127.0.0.1:8001 (NO uses "localhost" en curl: resuelve a ::1 y falla; en el navegador sí funciona). El prototipo se sirve en http://127.0.0.1:8080/ ; para apuntarlo al backend abre http://127.0.0.1:8080/index.html?api=http://127.0.0.1:8001#home . El puerto 8000 está ocupado por un contenedor ajeno roto: no lo toques.
Idioma de la UI y de los mensajes: español. No menciones Davivienda ni Puntored en textos nuevos; el soporte es hola@oplat.co / WhatsApp 3332822713.
Al terminar devuelve el JSON pedido. No hagas commits.

ESPECIFICACIÓN DEL USUARIO (contrato de integration-backend y alcance):
${SPEC}
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

phase('API')
const api = await agent(`${PREAMBLE}
TU TAREA (solo js/api.js): implementa el punto 1 de "Qué implementar". Agrega a App.api: products(), efectyQuote(body), efectySend(body), efectyGet(id), brebResolve(key) (body {key}), brebSend(body), brebGet(id), payService(body), serviceTransaction(id), companies(params) (query string: category, q, limit, offset; omite los undefined). Mantén catalog() y validateService(). Conserva ApiError y el manejo de detail (string -> detail, array/objeto -> null). Añade un helper App.api.errorMessage(e, fallback) que devuelva e.detail si es string no vacío, si no el fallback (los flujos lo usarán). Actualiza el comentario de cabecera. Verifica con node --check js/api.js y con curl a 127.0.0.1:8001 que las rutas existen (GET /v1/products, POST /v1/efecty/quote, POST /v1/breb/keys/resolve, POST /v1/services/pay con company_id vanti / reference 12345678 / amount del validate).`, {
  label: 'api', phase: 'API', model: 'sonnet', schema: RESULT_SCHEMA,
})
log('api.js listo: ' + api.summary.slice(0, 160))

phase('Pantallas')
const OWNERSHIP = `Propiedad de archivos (estricta; otros agentes editan el resto en paralelo, NO toques archivos ajenos):
- efecty: js/screens/efecty.js (nuevo), css/efecty.css (nuevo), assets/icons/cat-efecty.svg (nuevo).
- breb: js/screens/breb.js (nuevo), css/breb.css (nuevo), assets/icons/cat-breb.svg (nuevo).
- servicios: js/screens/servicios.js.
- home: js/screens/onboarding.js, js/core.js (solo App.entries), index.html (registro de css y scripts), README.md.
js/api.js ya está listo con: ${api.summary}`

const screens = await parallel([
  () => agent(`${PREAMBLE}
${OWNERSHIP}
TU ROL: efecty. Implementa el flujo Giro Efecty (punto 3 y 6.3). Pantallas: 'efecty' (entrada: beneficiario: cédula con puntos aceptados, nombre, celular opcional; stepper de 3 pasos Beneficiario → Monto → Confirmación), 'efecty-monto' (chips de montos sugeridos + input "$ 250.000"; valida min/max del producto obtenido de App.api.products() con respaldo 10.000–1.500.000 si no responde; guarda los límites en App.flow), 'efecty-confirm' (llama efectyQuote al entrar, muestra amount, fee y total con ui.rows, sheet "Ver detalles" → segundo toque envía efectySend), 'efecty-pasarela' (ui.pasarela mientras responde el POST real; no uses temporizador fijo para el éxito, espera la respuesta) y 'efecty-ok' (comprobante: message, claim.instructions, transfer_id, beneficiario (nombre y cédula normalizada), total, expires_at formateado dd/mm/aaaa, estado "Disponible para reclamar"; ui.finishLink). Errores: muestra App.api.errorMessage(e, 'No pudimos procesar el giro, intenta de nuevo') en un .err visible en la pantalla donde ocurrió, sin avanzar. Validación en cliente: cédula 6–15 dígitos (strip de puntos/espacios), nombre 1–80, celular opcional 10 dígitos que empiece por 3, monto entero dentro de límites. CSS propio con prefijo ef-. Icono cat-efecty.svg (33.156×36.84, estilo línea stroke #3D4B66 como los demás de assets/icons: p.ej. billete con flecha). Prueba con node --check y con curl los dos casos del usuario (250.000 OK a 1.020.304.050; 2.000.000 → 422 con detail). Debug rápido: http://127.0.0.1:8080/index.html?api=http://127.0.0.1:8001&go=efecty .`, {
    label: 'efecty', phase: 'Pantallas', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${OWNERSHIP}
TU ROL: breb. Implementa el flujo Transferencia Bre-B (punto 4 y 6.3). Pantallas: 'breb' (input de llave con ayuda "celular, correo, documento o llave alfanumérica", botón "Consultar llave" → brebResolve; si 404 muestra e.detail y NO avanza; si existe muestra tarjeta con holder_name enmascarado, bank y key_type legible, y pasa a 'breb-monto'), 'breb-monto' (input "$ 150.000" + descripción opcional máx. 100; valida min/max de App.api.products() con respaldo 1.000–5.000.000), 'breb-confirm' (sheet "Ver detalles" con llave, titular, banco, monto, descripción; segundo toque → brebSend; 404/422/409 → .err con e.detail), 'breb-pasarela' (ui.pasarela mientras responde el POST real) y 'breb-ok' (comprobante: message, transfer_id, status "Completada", titular, banco, llave, monto, descripción, created_at formateado; ui.finishLink). Stepper de 3 pasos Llave → Monto → Confirmación. CSS propio con prefijo bb-. Icono cat-breb.svg (33.156×36.84, estilo línea stroke #3D4B66: p.ej. llave o flechas de transferencia). Prueba con node --check y con curl los casos del usuario (3001234567 existe; 3001234560 no existe; 150.000 a ana@correo.com OK; 6.000.000 → 422). Debug: http://127.0.0.1:8080/index.html?api=http://127.0.0.1:8001&go=breb .`, {
    label: 'breb', phase: 'Pantallas', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${OWNERSHIP}
TU ROL: servicios. En js/screens/servicios.js (punto 5 y 6.4/6.5): (a) en validateRef conserva trace, requires_amount, partial_allowed, min_amount, max_amount y due_date (tolera null) del validate y guárdalos en flow (flow.trace, flow.requiresAmount...); si requires_amount es true el valor debe ser editable aunque la empresa local no sea partial; usa min_amount/max_amount del validate para validar el monto (respaldo: MIN_PAY y bill). (b) En confirm (segundo toque) reemplaza la simulación: ve a 'servicios-pasarela' y desde su mount llama App.api.payService({trace: flow.trace ?? null, company_id, reference, amount, client_ip: null}); con 200 guarda status, transaction_id, authorization_code, date, message en flow.receipt y ve a 'servicios-ok'; con error vuelve a 'servicios-form' con el .err = App.api.errorMessage(e, 'No pudimos confirmar el pago, intenta de nuevo') sin reintentar automáticamente (504: muestra el detail y no reintentes). Sin servidor (error de red sin status) conserva la simulación local actual como respaldo y márcalo en el comprobante como "Simulado". (c) En 'servicios-ok' muestra Estado según status (approved → "Aprobada" verde, pending → "Pendiente", rejected → "Rechazada" rojo), "Número de autorización" = authorization_code, "ID transacción" = transaction_id. (d) Quita del comprobante la línea Davivienda/3487881/01 8000 y el bloque bank() de "Entidad financiera/Corresponsal" (deja solo la nota de soporte hola@oplat.co / WhatsApp 3332822713); si bank() queda sin uso elimínalo. (e) Catálogo: cuando el usuario entra a las categorías administracion u otros y el catálogo remoto no trae empresas para ellas, pide App.api.companies({category, limit: 50}) y mezcla los ítems (id, name, category, partial, logo_key) en App.data.servicios. Mensajes de error con e.detail cuando exista. Prueba con node --check y con curl (validate vanti/12345678 y pay). Debug: http://127.0.0.1:8080/index.html?api=http://127.0.0.1:8001#servicios .`, {
    label: 'servicios', phase: 'Pantallas', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${OWNERSHIP}
TU ROL: home. (1) js/screens/onboarding.js: en el arreglo PRODUCTS (cerca de la línea 95) añade {id:'efecty', label:'Giro Efecty', icon:'cat-efecty', tip:'Envía efectivo para reclamar<br>en un punto Efecty'} y {id:'breb', label:'Bre-B', icon:'cat-breb', tip:'Transfiere al instante<br>a una llave Bre-B'} (los iconos assets/icons/cat-efecty.svg y cat-breb.svg los crean otros agentes; referencia esos nombres). Al montar Home llama App.api.products() una vez (cachea en App.data.products) y oculta las tarjetas cuyo producto exista en la respuesta con enabled:false (mapea id 'services' ↔ 'servicios'; recargas/paquetes/pines no están en la API y se muestran siempre); si la petición falla, muestra todas las tarjetas con los datos locales. Repinta la Home cuando llegue la respuesta solo si sigue siendo la pantalla activa. La grilla es de 3 columnas: con 6 tarjetas quedan 2 filas; ajusta css/styles.css SOLO si es imprescindible para que quepan en 568px (puedes reducir row-gap o la altura de .cat-card). (2) js/core.js: añade 'efecty' y 'breb' a App.entries (nada más). (3) index.html: registra css/efecty.css y css/breb.css tras servicios.css y los scripts js/screens/efecty.js y js/screens/breb.js tras servicios.js. (4) README.md: añade las filas #efecty y #breb a la tabla de flujos, documenta que consume integration-backend (productos, Efecty, Bre-B, pago de servicios) con ?api= y la API key de demo, y los casos de prueba manual del usuario. Verifica con node --check js/screens/onboarding.js js/core.js.`, {
    label: 'home', phase: 'Pantallas', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
])
const done = screens.filter(Boolean)
const issues = done.flatMap(r => r.openIssues || [])
log(`Pantallas listas: ${done.length}/4 agentes; openIssues: ${issues.length}`)

phase('Verificación')
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    defects: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, claim: { type: 'string' }, severity: { type: 'string' } }, required: ['file', 'claim', 'severity'] } },
    evidence: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'defects', 'evidence'],
}
const CASES = `Casos obligatorios (con gsd-browser contra http://127.0.0.1:8080/index.html?api=http://127.0.0.1:8001#home ; viewport 390x844; el prototipo escala un dispositivo 320x568; usa gsd-browser snapshot/click-ref/fill-ref y screenshots en el scratchpad; si el daemon se cuelga: gsd-browser daemon stop):
1. Home muestra 6 tarjetas incluidas "Giro Efecty" y "Bre-B" con sus iconos; con el backend caído (?api=http://127.0.0.1:8999) también se muestran.
2. Giro de 250.000 a la cédula 1.020.304.050 (nombre "Ana Pérez"): cotización con amount/fee/total, envío real, comprobante con transfer_id EF-..., instrucciones de reclamo y vencimiento a 30 días.
3. Giro de 2.000.000: error de máximo con el detail del backend, sin avanzar.
4. Llave 3001234567: muestra titular enmascarado y banco antes de pedir el monto. Llave 3001234560: error "no existe" y no avanza.
5. Transferencia de 150.000 a ana@correo.com con descripción "Arriendo": comprobante con transfer_id BB-... . Transferencia de 6.000.000: error de máximo.
6. Pago de servicios: Vanti, referencia 12345678 → Consultar → Confirmar → pago real: comprobante con Estado Aprobada, número de autorización e ID transacción del backend; sin textos de Davivienda/Entidad financiera.
7. node --check de todos los js; sin errores en la consola del navegador (gsd-browser console) en los recorridos; cada pantalla cabe en 320x568 o scrollea.`

let verdict = await agent(`${PREAMBLE}
Eres el verificador (Opus). Los agentes reportaron: ${JSON.stringify(done.map(r => r.summary))}. openIssues: ${JSON.stringify(issues)}.
Primero resuelve tú mismo los openIssues y cualquier inconsistencia de integración entre archivos (nombres de pantallas, iconos, App.entries, index.html). Luego ejecuta los casos y devuelve {pass, defects[], evidence[]}. pass=true solo si TODOS los casos pasan. Si un defecto es pequeño y evidente, corrígelo tú y re-verifica; lista en defects solo lo que no corregiste.
${CASES}`, {
  label: 'verify', phase: 'Verificación', model: 'opus', schema: VERIFY_SCHEMA,
})

for (let round = 1; !verdict.pass && verdict.defects.length && round <= 2; round++) {
  log(`Ronda de fixes ${round}: ${verdict.defects.length} defectos`)
  await agent(`${PREAMBLE}
Eres el fixer (ronda ${round}). Corrige TODOS estos defectos reportados por el verificador, respetando las convenciones y sin romper lo demás. Verifica con node --check y con curl. Defectos: ${JSON.stringify(verdict.defects)}`, {
    label: `fix:${round}`, phase: 'Verificación', model: 'sonnet', schema: RESULT_SCHEMA,
  })
  verdict = await agent(`${PREAMBLE}
Eres el verificador (Opus), re-verificación tras la ronda de fixes ${round}. Defectos que debían corregirse: ${JSON.stringify(verdict.defects)}. Vuelve a ejecutar TODOS los casos y devuelve {pass, defects[], evidence[]}.
${CASES}`, {
    label: `verify:${round}`, phase: 'Verificación', model: 'opus', schema: VERIFY_SCHEMA,
  })
}

return { api: api.summary, screens: done.map(r => ({ summary: r.summary, files: r.filesChanged })), verdict }
