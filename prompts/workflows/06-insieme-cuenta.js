// Workflow 6: Cuenta Insieme opcional (registro con contraseña sin verificación), facturas y destinos guardados en el servidor,
// envíos a un clic con destino conocido + grant de Interledger guardado en la cuenta.
// Ola 1 (paralelo): backend + frontend-base (Sonnet) -> Ola 2 (paralelo): facturas, dinero, docs -> compuerta Opus (+ fixers Sonnet)
// -> 2 rondas adversariales Fable (3 lentes) con fixers Sonnet -> compuerta final Opus.
// args: { repo, userPrompts[] } (los prompts del usuario, verbatim, para prompts/sesion-claude-code.md).

export const meta = {
  name: 'insieme-cuenta',
  description: 'Cuenta Insieme opcional: registro, facturas y destinos guardados, envíos a un clic con grant en la cuenta',
  phases: [
    { title: 'Ola 1', detail: 'backend (auth, /me, grant en cuenta, tests) y frontend-base (sesión, /cuenta, shell, Home) en paralelo' },
    { title: 'Ola 2', detail: 'facturas en servidor, destinos guardados en giros/Bre-B, docs; en paralelo' },
    { title: 'Compuerta', detail: 'Opus: build/checks/test, docker, recorrido completo con pagos reales mínimos; fixers Sonnet' },
    { title: 'Adversarial', detail: 'Fable, 2 rondas x 3 lentes; fixers Sonnet' },
    { title: 'Cierre', detail: 'Opus: compuerta final' },
  ],
}

const REPO = args.repo
const USER_PROMPTS = args.userPrompts

const PREAMBLE = `Repo: ${REPO} (pnpm monorepo: backend/ Express 4 + Objection/Knex + awilix (CLASSIC: los nombres de parámetros del constructor deben coincidir con los registros de backend/src/container.ts), shared/ (zod + tipos, paquete @insieme/shared; build con "npx -y pnpm@9.1.4 --filter @insieme/shared build" antes de compilar backend/frontend), frontend/ React 18 + Vite 5 + Tailwind + react-router 6 (createBrowserRouter con basename '/pay' en frontend/src/app/index.tsx, rutas lazy por carpeta en frontend/src/app/*/routes.tsx) + @tanstack/react-query + valtio (stores persistidos con valtioPersist en frontend/src/lib/stores), local/ docker compose). pnpm NO está en PATH: usa "npx -y pnpm@9.1.4 <cmd>" desde la raíz. Comandos: build, checks (prettier + eslint --max-warnings=0), test (backend, jest + testcontainers; en este Mac exporta TESTCONTAINERS_RYUK_DISABLED=true), docker:up (reconstruye y levanta insieme-postgres :15434, insieme-backend :3004, insieme-frontend :4004; el portal vive en http://localhost:4004/pay/ y la landing estática en /). Formatea con "npx -y pnpm@9.1.4 prettier --config .prettierrc.js --write <archivos>". Para curl usa 127.0.0.1 (localhost resuelve a ::1).
PROHIBIDO: leer, imprimir, copiar o escribir backend/.env, backend/.env.local, frontend/.env* o cualquier .env* (regla de permisos; backend/.env.example sí se puede editar); no añadir variables de entorno nuevas (defaults en código). No hacer commits. No ejecutar nunca un pago real de "Pago de servicios" (POST /v1/services/pay del integration-backend en host.docker.internal:8000 apunta a un proveedor real en preproducción); los pagos reales de prueba se hacen SOLO con Giro Efecty (mínimo 10.000 COP) o Transferencia Bre-B (mínimo 1.000 COP) y con la billetera pagadora $ilp.interledger-test.dev/91b7c20f (EUR; cada pago gasta saldo: usa el mínimo y haz los menos posibles). Nunca pagar desde la billetera de la tienda. gsd-browser (CLI: navigate, set-viewport --width --height, reload, screenshot --output, eval, find, snapshot, console) lo usan solo los verificadores Opus/Fable; el viewport se reinicia al navegar: navigate -> set-viewport -> reload.
Identidad Insieme: morado brand #7A1FA2, amarillo accent #FFC20E (acción), verde allies #137766; tokens Tailwind ya existentes (brand, brand-soft, brand-soft-active, accent, allies, neutral-*, sheet, page, magenta=error, success), componentes en frontend/src/components/insieme (Screen, TitleBox, StepTitle, FloatingInput, MoneyInput, Actions, BackButton, BrandFooter, KvRows, Tip, CategoryCard...) y frontend/src/components/ui (Button con variantes active|disabled|dark|solid|outline|secondary|link). Español de Colombia, tuteo, textos claros. Prohibido en la UI: "Davivienda", teléfonos distintos a WhatsApp 333 282 2713, "Transacción procesada por", "Entidad financiera", "Corresponsal", nombrar al proveedor de recaudo (PuntoRed). Responsive desde 360 px; textos largos con [overflow-wrap:anywhere].
CONTRATO FIJO (ya escrito y compilado, léelo primero): ${REPO}/shared/src/account.ts (registerSchema, loginSchema, saveBillSchema, updateBillSchema, saveDestinationSchema, updateDestinationSchema, tipos AccountUser, SessionResponse, MeResponse, SavedBill, SavedDestination, SetupFinishResponse, InstantBuyAccountResponse) y ${REPO}/shared/src/validation.ts (instantBuySchema ya tiene accessToken/manageUrl opcionales; backend/src/order/controller.ts tiene un TODO(cuenta) temporal que responde 400 cuando faltan). Envelope de respuestas: {success, message, result} vía toSuccessResponse (backend/src/lib/utils.ts); errores {success:false, message, errors:{campo:msg}} con BadRequest('Invalid input', {campo: msg}), Unauthorized, Conflict, NotFound de backend/src/lib/errors; el middleware validate (backend/src/middleware/validate.ts) une paths con "." y el frontend mapea por el último segmento.
Decisión de producto (del usuario, verbatim): "${USER_PROMPTS[0]}" y "${USER_PROMPTS[1]}". Interpretación fija: "ningún dato se valida" = sin verificación (sin OTP, sin KYC, sin confirmar correo/celular); SÍ se exigen presencia y formato básico (schemas del contrato), contraseña >= 8 con confirmación igual y correo único porque es el identificador de ingreso.
`

const ACCOUNT_DESIGN = `DISEÑO FIJO DE LA CUENTA INSIEME:
BACKEND
- Migración backend/migrations/20261017120000_insieme_accounts.js: en "users" (hoy: id uuid, walletAddress NOT NULL UNIQUE, createdAt, updatedAt; orders.userId es nullable con FK a users CASCADE) hacer walletAddress nullable y añadir name string, document string, email string (índice único sobre lower(email), parcial WHERE email IS NOT NULL), phone string, passwordHash string, oneClickGrant jsonb nullable ({accessToken, manageUrl, walletAddressUrl, createdAt}). Tablas nuevas: sessions(id uuid pk default gen_random_uuid(), userId uuid FK users CASCADE, tokenHash string unique, expiresAt timestamp, createdAt), savedBills(id uuid pk, userId FK CASCADE, productId uuid FK products, name, ref1, ref2 nullable, lastAmount integer nullable, lastPaidAt timestamp nullable, createdAt, updatedAt, unique(userId, productId, ref1)), savedDestinations(id uuid pk, userId FK CASCADE, kind string ('efecty'|'breb'), identity string (recipientDocument normalizado o key normalizada en minúsculas/trim), label string, details jsonb, lastAmount integer nullable, lastUsedAt timestamp nullable, createdAt, updatedAt, unique(userId, kind, identity)). down() revierte. backend/tests/tables.ts trunca todas las tablas dinámicamente: no hay que tocarlo.
- Contraseñas: crypto.scrypt de Node (N=16384, r=8, p=1, sal de 16 bytes, formato "scrypt$<saltB64>$<hashB64>") con timingSafeEqual; sin dependencias nuevas. Token de sesión: 32 bytes aleatorios en base64url; en DB solo sha256 hex; expira a 30 días; se envía en "Authorization: Bearer <token>". Nunca loguear contraseñas ni tokens. User.$formatJson omite passwordHash, oneClickGrant y walletAddress.
- backend/src/middleware/auth.ts: requireAuth (401 Unauthorized 'Inicia sesión para continuar' si falta o expiró) y optionalAuth (silencioso); ambos colocan req.user (tipar vía backend/src/global.d.ts o un tipo Request extendido). La propiedad SIEMPRE sale de req.user.id, nunca del body; un recurso ajeno responde 404 NotFound (no 403, sin filtrar existencia).
- Módulos nuevos (modelo + servicio + controlador, registrados en container.ts con asClassSingletonWithLogger o asClass().singleton()): backend/src/auth (AuthService: register, login, logout, authenticate(token)), backend/src/account (SavedBill y SavedDestination modelos/servicio/controlador; MeController). Rutas en app.ts: POST /auth/register (201 SessionResponse; correo repetido -> 409 Conflict con errors.email 'Ya existe una cuenta con este correo'); POST /auth/login (200 SessionResponse; credenciales malas -> 401 Unauthorized 'Correo o contraseña incorrectos' con errors.password); POST /auth/logout (requireAuth, borra la sesión, 200); GET /me (requireAuth, MeResponse: user + grant {walletAddressUrl, createdAt} o null; NUNCA accessToken/manageUrl); DELETE /me/grant (requireAuth; borra oneClickGrant); GET/POST /me/bills, PATCH/DELETE /me/bills/:id (saveBillSchema/updateBillSchema; POST con (productId, ref1) repetido -> 200 devolviendo la existente actualizada en name/ref2); GET/POST /me/destinations, PATCH/DELETE /me/destinations/:id (saveDestinationSchema: upsert por (kind, identity) actualizando label/details/lastAmount y lastUsedAt=now; updateDestinationSchema). Listas ordenadas por lastUsedAt/lastPaidAt desc, luego createdAt desc.
- Pago en un clic en la cuenta: POST /orders/setup-one-click/finish con optionalAuth: si hay req.user, guardar el grant en users.oneClickGrant y responder SetupFinishResponse {walletAddressUrl, storedInAccount:true} SIN tokens; sin sesión, responder como hoy + storedInAccount:false. POST /orders/instant-buy con optionalAuth: si el body trae accessToken y manageUrl se usan como hoy (y se devuelven rotados); si no y req.user tiene oneClickGrant, usar el grant guardado, persistir el token rotado (tokenInfo) en la cuenta y responder {walletAddressUrl, orderId} sin tokens; si no hay grant -> 400 BadRequest con errors.accessToken 'Configura el pago en un clic antes de usarlo'. Si Open Payments responde 401 usando el grant guardado: borrar oneClickGrant y responder 401 como hoy. Reemplaza el TODO(cuenta). POST /orders y /orders/instant-buy con optionalAuth asignan orders.userId = req.user.id cuando hay sesión (orderService.create ya acepta userId).
- Tests (jest, mismo patrón que backend/tests/order/controller.test.ts con node-mocks-http y createContainer/createApp; añade a backend/tests/helpers.ts un helper registerUser(container, overrides) que devuelve {token, user}): backend/tests/auth/controller.test.ts (registro 201 sin exponer passwordHash, correo duplicado 409 con errors.email, login ok, login contraseña mala 401, logout invalida el token -> GET /me 401, token inventado 401, contraseñas distintas 400 errors.passwordConfirm); backend/tests/account/bills.test.ts (CRUD, upsert por productId+ref1, aislamiento: el usuario B recibe 404 al leer/editar/borrar la factura de A, lista de B vacía); backend/tests/account/destinations.test.ts (upsert por identidad no duplica y actualiza lastAmount/label; aislamiento; validación por kind); backend/tests/order/controller.test.ts añade: instant-buy sin tokens y sin sesión -> 400 errors.accessToken; con sesión y grant guardado -> openPayments.instantBuy (spy) recibe el accessToken guardado, la respuesta no trae tokens y el token rotado queda persistido; setup-one-click/finish con sesión guarda el grant y no devuelve tokens (mockea continueGrant y verifyHash). Los 121 tests actuales siguen verdes.
FRONTEND
- frontend/src/lib/stores/auth-store.ts (valtioPersist 'auth-store': {token:string, user: AccountUser|null}, con loadGuard zod; setSession, clearSession) y hook frontend/src/hooks/use-auth.ts (useSession(): {token, user, isLoggedIn}). frontend/src/lib/fetcher.ts añade "Authorization: Bearer" cuando hay token; si la respuesta es 401 Y la URL empieza por /auth/ o /me, hace clearSession (NUNCA en /orders/*: el instant-buy ya devuelve 401 cuando el token de Open Payments caducó y ConfirmPanel depende de atraparlo).
- Hooks react-query tipados con @insieme/shared: use-register-mutation, use-login-mutation, use-logout-mutation, use-me-query (enabled solo con token; queryKey ['me']), use-saved-bills (query + create/update/remove mutations, queryKey ['me','bills']), use-saved-destinations (query + save/update/remove, queryKey ['me','destinations']), use-clear-grant-mutation. Errores de API por campo -> form.setError por el último segmento del path.
- Rutas nuevas frontend/src/app/cuenta/{routes.tsx,index.tsx,registro.tsx,ingresar.tsx} montadas en '/cuenta' en frontend/src/app/index.tsx: /cuenta/registro (FloatingInput: Nombre completo, Documento de identidad (cédula o pasaporte), Correo, Celular, Contraseña, Confirmar contraseña; aviso visible: "Versión de prueba sobre la testnet de Interledger: no verificamos correo, celular ni identidad"; botón "Crear mi cuenta"; enlace "Ya tengo cuenta"); /cuenta/ingresar (Correo, Contraseña, "Ingresar", enlace "Crear cuenta"); ambos aceptan ?next= y tras éxito setSession + navigate(next || '/'). /cuenta (con sesión): datos del usuario, bloque "Pago en un clic" (si grant: "Activo con la billetera <wallet>" + botón "Desvincular"; si no: texto de cómo activarlo al pagar), "Destinos guardados" (lista con etiqueta, tipo Giro Efecty/Bre-B, último valor, botón "Enviar de nuevo" -> /giros?destino=ID o /breb?destino=ID, y eliminar), enlace "Mis facturas" -> /facturas, botón "Cerrar sesión" (POST /auth/logout best-effort, clearSession, resetToken() del token-store, queryClient.clear(), navigate('/')). Sin sesión, /cuenta redirige a /cuenta/ingresar.
- Shell (frontend/src/components/layouts/app-shell.tsx): a la derecha del header, con sesión un pill con el primer nombre -> /cuenta; sin sesión un pill "Mi cuenta" -> /cuenta/ingresar; conservar el pill "Inicio" fuera de Home (pueden ir los dos, compactos). Home (frontend/src/app/home/index.tsx): sin sesión, debajo del hero un banner "Crea tu cuenta para guardar tus facturas y destinos frecuentes" con botones "Crear cuenta" y "Ingresar"; con sesión, sección "Envíos rápidos" (componente frontend/src/components/account/quick-destinations.tsx: tarjetas de destinos guardados con etiqueta, tipo, último valor y acción "Enviar de nuevo" -> /giros?destino=ID | /breb?destino=ID; estado vacío "Guarda un destino al hacer tu primer giro o transferencia"; shimmer al cargar) y saludo "Hola, <nombre>".
- Facturas (frontend/src/app/facturas/**, frontend/src/lib/stores/facturas-store.ts, frontend/src/hooks/use-facturas-store.ts): sin sesión, todas las rutas /facturas/* muestran una pantalla AccountGate (frontend/src/components/account/account-gate.tsx: "Guarda tus facturas con una cuenta Insieme", beneficios en 3 bullets, botones "Crear cuenta" -> /cuenta/registro?next=/facturas e "Ingresar" -> /cuenta/ingresar?next=/facturas). Con sesión, la fuente de verdad es el servidor: mantener la forma FacturaItem y los nombres useFacturasStore/useFacturasWithAvailability, addFactura/updateFactura/removeFactura/markPaid, pero implementados sobre los hooks de /me/bills (mapeo SavedBill -> FacturaItem: name, productId, ref1, ref2 ?? '', lastPay = lastPaidAt formateado como hoy, amount = lastAmount; cat y conv se derivan del catálogo por productId). Las pantallas nueva/guardada/editar/pagar siguen funcionando con mutaciones async (estados de carga y errores por campo). Importación única: al tener sesión, si localStorage 'mb-facturas' tiene items, hacer POST de cada uno (ignorando duplicados), vaciar el store local y mostrar toast "Importamos N facturas guardadas en este dispositivo". markPaid -> PATCH {lastAmount, lastPaidAt} (en checkout/confirmation al quedar SETTLED, como hoy).
- Giro Efecty (frontend/src/app/giros/index.tsx) y Bre-B (frontend/src/app/breb/index.tsx): leer ?destino=<id> con useZodSearchParams; al cargar el destino (de la query de destinos) prellenar el formulario y reutilizar EXACTAMENTE la ruta de rehidratación existente (el useEffect que re-cotiza/re-resuelve y salta de paso): Efecty re-cotiza con lastAmount y aterriza en el paso de confirmación; Bre-B re-resuelve la llave (titular/banco pueden cambiar) y aterriza en el paso 3 con lastAmount; si no hay lastAmount, aterriza en el paso del valor. Con sesión, el paso 1 muestra arriba "Tus destinos guardados" (lista compacta del kind correspondiente; al tocar uno se navega a ?destino=ID). En el paso de confirmación, con sesión, checkbox "Guardar este destino para la próxima vez" marcado por defecto (etiqueta por defecto: nombre del beneficiario o titular enmascarado/llave). ConfirmPanel ya expone onCreated(orderId): las páginas pasan onCreated para hacer el upsert del destino (saveDestination con details y lastAmount = valor base, no el total con comisión) y, si venía de ?destino, PATCH lastUsedAt.
- ConfirmPanel (frontend/src/components/payment/confirm-panel.tsx): con sesión y me.grant, "pago en un clic activo" cuando normalizeWallet(me.grant.walletAddressUrl) === normalizeWallet(input) -> instantBuy SIN accessToken/manageUrl; prefill de la billetera: me.grant.walletAddressUrl > token-store > profile. Ante 401/limit con grant de cuenta: invalidar ['me'], toast y caer al flujo con redirección (como hoy con resetToken). Texto: "Pago en un clic activo para esta billetera: se pagará sin redirección." Sin sesión, todo como hoy (token-store).
- cart/finish (frontend/src/app/cart/finish.tsx): si result.storedInAccount -> queryClient.invalidateQueries(['me']) y texto "¡Pago en un clic guardado en tu cuenta!"; si no -> setToken como hoy. use-instant-buy-mutation: solo setToken si la respuesta trae accessToken.
- Tipos del frontend: importar desde @insieme/shared (frontend/src/lib/api-types.ts puede re-exportar). Sin "any". prettier + eslint limpios.
DOCS Y POLÍTICA DE IA
- README.md: sección "Cuenta Insieme (opcional)" (qué habilita, qué NO se verifica, cómo probar), tabla real/simulado actualizada (cuenta sin verificación de identidad; contraseñas con scrypt; grant guardado en la cuenta). docs/ARCHITECTURE.md: sesiones Bearer, módulos auth/account, flujo del grant en la cuenta (diagrama de secuencia mermaid del envío a un clic). docs/THREAT_MODEL.md: filas nuevas (credenciales: scrypt + timingSafeEqual; tokens de sesión solo hasheados; grant de Open Payments en reposo sin cifrar = riesgo aceptado para la demo, cifrado pendiente; sin rate limiting ni OTP ni KYC = demo; IDOR mitigado por propiedad en servidor con 404; logout invalida sesión; el frontend no cierra sesión por 401 de /orders). AI_USAGE.md: fila del workflow 06 y nota de que las decisiones de producto (registro opcional, sin verificación) las tomó el equipo. prompts/README.md: entrada 06. prompts/sesion-claude-code.md: añadir al final las secciones 16, 17 y 18 con estos prompts del usuario VERBATIM (no parafrasear): ${JSON.stringify(USER_PROMPTS)}; la 18 corresponde al bug de chunk obsoleto, ya corregido en el commit 0a84884 (errorElement RouteError con recarga única + Cache-Control no-cache para index.html e immutable para /pay/assets/).`

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
const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, claim: { type: 'string' }, severity: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'claim', 'severity', 'evidence', 'fix'] } },
    verifiedOk: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'verifiedOk'],
}

phase('Ola 1')
const wave1 = await parallel([
  () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
TU ROL: backend (Sonnet). Implementa TODO el bloque BACKEND del diseño (migración, modelos, auth, account, middleware, rutas, cambios en order/controller.ts para optionalAuth, grant en cuenta e instant-buy sin tokens, tests). Propiedad: backend/** y shared/** (solo si falta algo del contrato; no cambies lo que ya existe sin necesidad). No toques frontend/. Verifica: npx -y pnpm@9.1.4 build && checks && TESTCONTAINERS_RYUK_DISABLED=true npx -y pnpm@9.1.4 test (todo verde, incluidos los tests nuevos). Luego npx -y pnpm@9.1.4 docker:up y prueba con curl contra 127.0.0.1:3004: register 201, login 200, /me 401 sin token y 200 con token, bills/destinations CRUD, aislamiento entre dos usuarios (404), instant-buy sin tokens y sin sesión 400. Devuelve summary, filesChanged, openIssues (incluye el nombre exacto de los endpoints y cualquier desvío del contrato).`, {
    label: 'backend', phase: 'Ola 1', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
TU ROL: frontend-base (Sonnet). Implementa del bloque FRONTEND: auth-store, fetcher con Bearer y regla de 401, hooks (use-auth, register/login/logout, use-me-query, use-saved-bills, use-saved-destinations, use-clear-grant-mutation), rutas /cuenta (index, registro, ingresar) con sus formularios (useZodForm + registerSchema/loginSchema del contrato), AppShell con el pill de cuenta, Home con banner anónimo y sección "Envíos rápidos" (components/account/quick-destinations.tsx), components/account/account-gate.tsx (lo usará el agente de facturas), cambios en use-instant-buy-mutation (setToken solo si hay accessToken) y en cart/finish (storedInAccount). Propiedad: frontend/src/lib/stores/auth-store.ts, frontend/src/lib/fetcher.ts, frontend/src/hooks/{use-auth,use-register-mutation,use-login-mutation,use-logout-mutation,use-me-query,use-saved-bills,use-saved-destinations,use-clear-grant-mutation,use-instant-buy-mutation}.ts, frontend/src/app/cuenta/**, frontend/src/app/index.tsx, frontend/src/app/route-schemas.ts (añade destinoSearchParamsSchema {destino: uuid opcional} y nextSearchParamsSchema), frontend/src/components/layouts/app-shell.tsx, frontend/src/app/home/index.tsx, frontend/src/components/account/**, frontend/src/app/cart/finish.tsx, frontend/src/lib/api-types.ts. NO toques facturas/**, giros/**, breb/**, confirm-panel.tsx ni backend/ (otros agentes). El backend se implementa en paralelo: trabaja contra el contrato de shared/src/account.ts; verifica con npx -y pnpm@9.1.4 build && checks (tsc + eslint limpios) y revisa visualmente solo si el backend ya responde en :3004 (no es obligatorio). Devuelve summary, filesChanged, openIssues y la lista de hooks exportados con sus firmas (para los agentes de la ola 2).`, {
    label: 'frontend-base', phase: 'Ola 1', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
])
const [backend, frontendBase] = wave1
log('Ola 1: backend=' + (backend ? backend.summary.slice(0, 160) : 'null') + ' | frontend-base=' + (frontendBase ? frontendBase.summary.slice(0, 160) : 'null'))

phase('Ola 2')
const wave1Summary = JSON.stringify({ backend, frontendBase })
const wave2 = await parallel([
  () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
TU ROL: facturas (Sonnet). Implementa el bloque "Facturas" del diseño sobre los hooks que ya existen (resultado de la ola 1: ${wave1Summary}). Propiedad: frontend/src/app/facturas/**, frontend/src/lib/stores/facturas-store.ts, frontend/src/hooks/use-facturas-store.ts, frontend/src/app/checkout/confirmation.tsx solo en la llamada a markPaid si cambia de firma. Usa components/account/account-gate.tsx para el gate anónimo. No toques otros archivos (si necesitas algo de un hook de la ola 1, adáptalo con un wrapper dentro de tu propiedad y repórtalo en openIssues). Verifica: build && checks; con docker:up y un usuario registrado por curl, recorre con curl los endpoints que usas. Devuelve summary, filesChanged, openIssues.`, {
    label: 'facturas', phase: 'Ola 2', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
TU ROL: dinero (Sonnet). Implementa el bloque "Giro Efecty y Bre-B" y "ConfirmPanel" del diseño sobre los hooks de la ola 1 (resultado: ${wave1Summary}). Propiedad: frontend/src/app/giros/index.tsx, frontend/src/app/breb/index.tsx, frontend/src/components/payment/confirm-panel.tsx, frontend/src/components/account/saved-destinations-picker.tsx (nuevo: lista compacta por kind para el paso 1) y frontend/src/components/account/save-destination-checkbox.tsx (nuevo). No toques otros archivos. Cuida la rehidratación: ?destino= y el retorno del one-click (payment-draft-store) no deben pisarse (prioridad: draft del one-click si coincide el kind/productId; si no, destino). Verifica: build && checks; con docker:up, revisa con curl que /me/destinations funciona con un usuario de prueba; NO hagas pagos reales (los hace el verificador). Devuelve summary, filesChanged, openIssues.`, {
    label: 'dinero', phase: 'Ola 2', model: 'sonnet', schema: RESULT_SCHEMA,
  }),
  () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
TU ROL: docs (Haiku). Implementa el bloque "DOCS Y POLÍTICA DE IA" leyendo primero README.md, docs/ARCHITECTURE.md, docs/THREAT_MODEL.md, AI_USAGE.md, prompts/README.md y prompts/sesion-claude-code.md para seguir su estilo y numeración. Propiedad: solo esos archivos. Describe lo que el diseño fija (no inventes endpoints); el workflow 06 se guardará como prompts/workflows/06-insieme-cuenta.js (referencia ese nombre). Pasa prettier a los .md si el repo los formatea (revisa .prettierignore). Devuelve summary, filesChanged, openIssues.`, {
    label: 'docs', phase: 'Ola 2', model: 'haiku', schema: RESULT_SCHEMA,
  }),
])
const wave2Done = wave2.filter(Boolean)
log('Ola 2 completa: ' + wave2Done.map(r => r.summary.slice(0, 100)).join(' | '))

phase('Compuerta')
const GATE_CASES = `COMPUERTA (Opus). Integra primero: resuelve los openIssues de todos los agentes y las inconsistencias entre hooks/firmas; luego:
1. npx -y pnpm@9.1.4 build && checks && TESTCONTAINERS_RYUK_DISABLED=true npx -y pnpm@9.1.4 test: todo verde (121 previos + nuevos). Si quedan contenedores postgres de tests colgados, elimínalos.
2. npx -y pnpm@9.1.4 docker:up: la migración aplica sobre la base existente con datos (revisa logs de insieme-backend). curl 127.0.0.1:3004: /me sin token 401; register; login; usuario B no ve las facturas/destinos de A (404 y lista vacía); GET /me nunca trae accessToken/manageUrl; respuestas de /auth/* nunca traen passwordHash.
3. gsd-browser 390x844 en http://localhost:4004/pay/ (limpia localStorage antes): Home anónimo con banner -> Crear cuenta (datos de prueba, contraseña 8+) -> vuelve a Home con saludo y "Envíos rápidos" vacío; header con el nombre. /facturas: crear (empresa del catálogo, referencia válida) -> guardada -> lista desde el servidor (recarga la página y sigue). /cuenta: datos, sin grant, enlace a facturas.
4. Giro Efecty 10.000 COP (mínimo) con checkbox "Guardar este destino" marcado, billetera $ilp.interledger-test.dev/91b7c20f: la billetera redirige a /pay/checkout/confirmation?orderId=..., tracker avanza, orden SETTLED (GET :3004/orders/:id). Home muestra el destino en "Envíos rápidos" y /cuenta lo lista con el último valor.
5. Pago en un clic en la cuenta: desde un panel de confirmación (Bre-B, llave 3001234567, 1.000 COP) abre "Configurar pago en un clic", autoriza en la billetera, vuelve a /pay/cart/finish con el mensaje de guardado en la cuenta; localStorage token-store queda sin accessToken; /cuenta muestra "Pago en un clic activo" con la billetera.
6. Envío a un clic: Cerrar sesión (verifica que localStorage no conserva token ni auth) -> Ingresar -> Home "Envíos rápidos" -> "Enviar de nuevo" sobre el destino Bre-B o Efecty -> aterriza en confirmación con el último valor -> "Confirmar y pagar": pago instantáneo SIN redirección (Bre-B 1.000 COP) -> /pay/checkout/confirmation -> SETTLED; GET /me sigue con grant (token rotado persistido). Verifica en la DB (docker exec insieme-postgres psql) que users.oneClickGrant cambió y que orders.userId quedó asignado.
7. Flujos anónimos intactos: en una sesión limpia, Pago de servicios hasta el panel (sin pagar), Giro Efecty paso 1 y 2 sin sesión (sin lista de destinos ni checkbox), /facturas muestra el gate con los dos botones y ?next funciona.
8. Responsive 360x640 de /cuenta/registro, /cuenta/ingresar y /cuenta (sin desbordes; errores de validación visibles por campo: contraseñas distintas, correo inválido, correo duplicado 409); sin errores de consola salvo los esperados; textos sin palabras prohibidas (grep -rni "davivienda\\|puntored\\|corresponsal\\|entidad financiera" frontend/src -> 0).
Corrige tú lo pequeño; devuelve {pass, defects[], evidence[], remaining[]} con evidencia concreta (ids de orden, referencias EF-/BB-).`
let gate = await agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres el integrador y verificador (Opus). Resultados de las olas: ${wave1Summary} ; ola 2: ${JSON.stringify(wave2Done)}.
${GATE_CASES}`, {
  label: 'gate', phase: 'Compuerta', model: 'opus', schema: VERIFY_SCHEMA,
})
for (let round = 1; !gate.pass && gate.defects.length && round <= 2; round++) {
  log(`Compuerta: ronda de fixes ${round} (${gate.defects.length} defectos)`)
  await agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres el fixer (Sonnet, ronda ${round}). Corrige TODOS estos defectos sin romper build/checks/test (sin gsd-browser ni pagos reales; verifica con tests y curl). Defectos: ${JSON.stringify(gate.defects)}`, {
    label: `fix:${round}`, phase: 'Compuerta', model: 'sonnet', schema: RESULT_SCHEMA,
  })
  gate = await agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres el verificador (Opus), re-verificación tras la ronda de fixes ${round}. Defectos que debían corregirse: ${JSON.stringify(gate.defects)}. Re-ejecuta la compuerta; puedes omitir los pagos reales que ya pasaron si no cambió código de pago (dilo en evidence).
${GATE_CASES}`, {
    label: `gate:${round}`, phase: 'Compuerta', model: 'opus', schema: VERIFY_SCHEMA,
  })
}
if (!gate.pass) {
  log('La compuerta no pasó tras 2 rondas; se omite la fase adversarial')
  return { backend, frontendBase, wave2: wave2Done, gate, adversarial: null, final: null }
}

phase('Adversarial')
const LENSES = [
  { key: 'seguridad', prompt: 'LENTE SEGURIDAD Y PROPIEDAD: intenta refutar que (a) ningún endpoint /me* ni /auth/* permite leer o modificar recursos de otro usuario (IDOR por id, por productId/ref1, por identity), (b) GET /me, /auth/* y /orders/* nunca exponen passwordHash, accessToken, manageUrl, continueToken ni nonces (revisa $formatJson y respuestas reales con curl), (c) el instant-buy con grant de cuenta no puede ser invocado sin sesión ni con sesión ajena, y el token rotado se persiste, (d) el fetcher del frontend no cierra la sesión por un 401 de /orders/instant-buy ni filtra el Bearer a otros orígenes, (e) contraseñas y tokens no aparecen en logs (revisa logger.* y docker logs insieme-backend durante un registro/login), (f) la sesión expirada o cerrada rechaza (401) y logout limpia token-store/auth-store, (g) validación: entradas con caracteres de control, correos con mayúsculas (unicidad case-insensitive), documentos con puntos. Usa curl y los tests; puedes escribir tests adicionales reproducibles.' },
  { key: 'correctitud', prompt: 'LENTE CORRECTITUD DE FLUJOS: intenta refutar que (a) ?destino= rehidrata Efecty y Bre-B al paso correcto con el último valor y no colisiona con el retorno del one-click (payment-draft-store), (b) el upsert de destinos no duplica tras pagar dos veces al mismo beneficiario y actualiza lastAmount/lastUsedAt, (c) la importación de mb-facturas ocurre una sola vez, no duplica y vacía el localStorage, (d) markPaid actualiza lastPaidAt/lastAmount de la factura al quedar SETTLED, (e) con grant de cuenta y billetera distinta en el input NO se usa el grant (cae a redirección), (f) ante 401 de Open Payments con grant de cuenta se borra el grant, se refresca /me y se continúa por redirección sin perder la orden, (g) refrescar la página en /cuenta, /facturas y en medio de giros con sesión no rompe (lazy routes + queries), (h) la migración es reversible (down) y el seed/tests con truncado siguen pasando. Usa gsd-browser 390x844 sin pagos reales salvo que sea imprescindible (máximo un Bre-B de 1.000 COP).' },
  { key: 'ux-docs', prompt: 'LENTE UX, COPY, ACCESIBILIDAD Y POLÍTICA DE IA: intenta refutar que (a) las pantallas /cuenta, /cuenta/registro, /cuenta/ingresar, el gate de facturas, la lista de destinos y "Envíos rápidos" son responsive en 360x640 y 1280x900 sin desbordes ni textos cortados (gsd-browser), con labels asociados, foco visible, errores anunciados (role=alert) y contraste AA, (b) el aviso "no verificamos correo, celular ni identidad" es visible en el registro, (c) no hay palabras prohibidas (Davivienda, PuntoRed, Corresponsal, Entidad financiera, teléfonos distintos a 333 282 2713) ni cifras no validadas en los textos nuevos, (d) la terminología es consistente (Giro Efecty, Transferencia Bre-B, Pago en un clic, Destinos guardados, Mis facturas), (e) README/ARCHITECTURE/THREAT_MODEL/AI_USAGE describen exactamente lo implementado (endpoints, scrypt, grant en cuenta, riesgos) y prompts/sesion-claude-code.md contiene los tres prompts del usuario VERBATIM: ' + JSON.stringify(USER_PROMPTS) + ' , (f) el header con nombre largo no rompe el layout móvil.' },
]
const adversarial = []
let fixedSoFar = []
for (let round = 1; round <= 2; round++) {
  log(`Adversarial ronda ${round}`)
  const found = (await parallel(LENSES.map(l => () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres un verificador adversarial (Fable), ronda ${round} de 2. Tu objetivo es REFUTAR que la implementación cumple el diseño; busca evidencia concreta (comandos, respuestas, capturas). ${round === 2 ? 'En esta ronda verifica además que los fixes de la ronda 1 son correctos y no introdujeron regresiones: ' + JSON.stringify(fixedSoFar) : ''}
${l.prompt}
Devuelve findings (file, claim, severity alta|media|baja, evidence, fix sugerido) solo con hallazgos reales y reproducibles, y verifiedOk con lo que sí comprobaste. No corrijas código.`, {
    label: `fable:${l.key}:${round}`, phase: 'Adversarial', model: 'fable', schema: FINDINGS_SCHEMA,
  })))).filter(Boolean)
  const seen = new Set()
  const findings = found.flatMap(f => f.findings).filter(f => {
    const k = f.file + '|' + f.claim.toLowerCase().slice(0, 80)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  adversarial.push({ round, findings, verifiedOk: found.flatMap(f => f.verifiedOk) })
  log(`Ronda ${round}: ${findings.length} hallazgos`)
  if (findings.length) {
    const byFile = {}
    for (const f of findings) (byFile[f.file] = byFile[f.file] || []).push(f)
    const groups = Object.values(byFile)
    await parallel(groups.map((g, i) => () => agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres el fixer (Sonnet) de la ronda adversarial ${round}, grupo ${i + 1}/${groups.length}. Corrige estos hallazgos del archivo ${g[0].file} (y solo lo imprescindible en archivos relacionados; otros fixers trabajan en paralelo sobre otros archivos: no edites archivos listados para otros grupos: ${JSON.stringify(Object.keys(byFile).filter(k => k !== g[0].file))}). Mantén build/checks/test verdes (sin gsd-browser ni pagos reales). Hallazgos: ${JSON.stringify(g)}`, {
      label: `fix-adv:${round}:${i + 1}`, phase: 'Adversarial', model: 'sonnet', schema: RESULT_SCHEMA,
    })))
    fixedSoFar = fixedSoFar.concat(findings.map(f => ({ file: f.file, claim: f.claim, fix: f.fix })))
  }
}

phase('Cierre')
const final = await agent(`${PREAMBLE}
${ACCOUNT_DESIGN}
Eres el verificador final (Opus). Hallazgos adversariales y fixes aplicados: ${JSON.stringify(adversarial)}. Ejecuta: npx -y pnpm@9.1.4 build && checks && TESTCONTAINERS_RYUK_DISABLED=true npx -y pnpm@9.1.4 test; npx -y pnpm@9.1.4 docker:up; recorrido corto con gsd-browser 390x844: registro nuevo -> Home con saludo -> /cuenta -> /facturas crear una -> Giro Efecty hasta el panel con checkbox (sin pagar) -> cerrar sesión -> gate de facturas; curl de aislamiento entre dos usuarios y de /me sin tokens expuestos. Un pago real solo si algún fix tocó el flujo de pago (máximo un Bre-B de 1.000 COP con el envío a un clic). grep de palabras prohibidas. Devuelve {pass, defects[], evidence[], remaining[]}; corrige tú lo pequeño.`, {
  label: 'final', phase: 'Cierre', model: 'opus', schema: VERIFY_SCHEMA,
})
return { backend, frontendBase, wave2: wave2Done, gate, adversarial, final }