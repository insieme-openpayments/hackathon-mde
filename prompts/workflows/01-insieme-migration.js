// Workflow 1 ejecutado con la herramienta Workflow de Claude Code (dynamic workflows).
// Contiene, literalmente, los prompts enviados a cada subagente (Haiku, Sonnet, Opus).
// args usados: { repo: "/Users/carlos/orca/hackathon-mde", plan: "<plan aprobado en la sesión>",
//   integration: "<copia local de insieme-openpayments/integration-backend>",
//   hackathonMed: "<copia local de insieme-openpayments/hackathon-med/hackathon-mde>",
//   payerWallet: "$ilp.interledger-test.dev/91b7c20f" }

export const meta = {
  name: 'insieme-migration',
  description: 'Rename boutique→insieme, catalog via API (integration-backend + fallback), settlement layer, migrate Servicios+Facturas UI from the Figma prototype, docs + AI policy; Opus verification with Sonnet fixers',
  phases: [
    { title: 'Rename', detail: 'boutique → insieme, pnpm install, build (Haiku)', model: 'haiku' },
    { title: 'Foundation', detail: 'backend catalog/orders/integration, frontend bootstrap, assets' },
    { title: 'Build', detail: 'settlement + 5 frontend packages + docs' },
    { title: 'Verify', detail: 'Opus integration + Sonnet fixes', model: 'opus' },
  ],
}

const RESULT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    openIssues: { type: 'array', items: { type: 'string' } },
    ok: { type: 'boolean' },
  },
  required: ['summary', 'filesChanged', 'openIssues', 'ok'],
}
const RENAME = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    remainingBoutiqueHits: { type: 'array', items: { type: 'string' } },
    buildOk: { type: 'boolean' },
    checksOk: { type: 'boolean' },
    ok: { type: 'boolean' },
  },
  required: ['summary', 'remainingBoutiqueHits', 'buildOk', 'checksOk', 'ok'],
}
const VERIFY = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    pass: { type: 'boolean' },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
        },
        required: ['file', 'description', 'severity'],
      },
    },
    manualSteps: { type: 'array', items: { type: 'string' } },
    evidence: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'pass', 'defects', 'manualSteps', 'evidence'],
}

const COMMON = `Repo: ${args.repo} (pnpm monorepo: backend/, frontend/, shared/, local/). pnpm is NOT on PATH: always run it as \`npx -y pnpm@9.1.4 <cmd>\` from the repo root (e.g. \`npx -y pnpm@9.1.4 --filter @insieme/backend test\`). Node 26 and Docker are available.
Read the approved plan FIRST, fully: ${args.plan} (API contract, file ownership, Spanish copy, verification). The Figma prototype being migrated is ${args.repo}/customer-frontend (its js/core.js, css/styles.css and js/screens/*.js are the source of truth for behaviour and copy). Read-only reference copies: the teammate's integration-backend (FastAPI) at ${args.integration}; the earlier hackathon-med prototype at ${args.hackathonMed}.
HARD RULES:
1. Only create/modify/delete files you OWN (listed below). If you need a change elsewhere, do NOT make it: put it in openIssues as "<file>: <exact change needed>".
2. Never read, cat, copy, print or modify any .env or .env.local file anywhere (permission-denied, they hold secrets). To run the backend locally against the local Postgres without editing env files, prefix the env var: \`DATABASE_URL=postgres://insieme_backend:insieme_backend@localhost:15434/insieme_backend npx -y pnpm@9.1.4 --filter @insieme/backend start\` (an env var set in the shell wins over --env-file).
3. Do not run git commit/push/checkout/stash/reset, do not run pnpm install (unless your instructions say so), do not run docker compose down -v.
4. After editing, format your files with \`npx prettier --config .prettierrc.js --write <files>\` from the repo root. ESLint runs with --max-warnings=0: no unused imports/vars; use '_' prefix for intentionally unused args. TypeScript is strict (noUnusedLocals/Parameters).
5. All user-facing UI copy is Spanish, verbatim from the prototype unless the plan marks it NEW.
6. Finish with the StructuredOutput: summary (what you did, what you verified), filesChanged (repo-relative), openIssues, ok (true only if your exit criteria passed).`

// ---------------------------------------------------------------- Phase 1
phase('Rename')
log('Rename boutique → insieme')
const rename = await agent(
  `${COMMON}

NOTE: a previous attempt of this exact task was interrupted midway; the tree may already be partially renamed (git status shows modified files). Continue idempotently until the gate passes.
TASK (mechanical rename; section "Rename boutique → insieme" of the plan, steps 1–4 plus the extra items below):
- Package identity: root package.json (name "insieme"; scripts boutique:backend/frontend → insieme:backend/frontend and every reference to them in test/dev/docker scripts; concurrently labels INSIEME-BE,INSIEME-FE), backend/package.json (name @insieme/backend, build:deps filter, dependency @insieme/shared), shared/package.json (@insieme/shared), frontend/package.json (name, build:deps filter, dependency). Replace every import of '@boutique/shared' with '@insieme/shared' (grep -rn "@boutique/shared" backend/src frontend/src shared). frontend/vite.config.ts: alias key '@insieme/shared' and allowedHosts ['insieme.test'].
- Infra: \`git mv boutique-entrypoint.sh insieme-entrypoint.sh\` and update its content; backend/Dockerfile.dev (every boutique reference), backend/Dockerfile.prod and frontend/Dockerfile.prod (pnpm insieme:* build); local/docker-compose.yml container_name insieme-postgres; local/docker-compose.app.yml container names insieme-backend/insieme-frontend and DATABASE_URL postgres://insieme_backend:insieme_backend@postgres:5432/insieme_backend; local/init/dbinit.sql (user/db/password insieme_backend); backend/knexfile.js; backend/.env.example (ONLY this file: it is an example without secrets — edit DATABASE_URL to insieme_backend and comments; do NOT touch .env.local).
- Strings: backend/src/app.ts log 'Insieme server started on port'; backend/src/open-payments/service.ts: the three 'Purchase at Test Boutique' descriptions → 'Pago en Insieme'; backend/jest.setup.js PAYMENT_POINTER placeholder → https://ilp.interledger-test.dev/insieme; frontend/index.html lang="es" and <title>Insieme Payments</title>; frontend/src/main.tsx log prefix 'Insieme:'; frontend/src/lib/constants.ts hostnames insieme.test / api.insieme.test, comments and log strings; frontend/src/app/products/index.tsx heading 'Insieme Payments'.
- Docs: README.md (replace boutique mentions with Insieme EXCEPT the upstream attribution lines that cite interledger/testnet packages/boutique and the commit URL — keep those verbatim), backend/README.md, frontend/README.md, frontend/.env.example (example file, no secrets).
- Then run \`npx -y pnpm@9.1.4 install\` (updates pnpm-lock.yaml link entries), \`npx -y pnpm@9.1.4 build\`, \`npx -y pnpm@9.1.4 checks\`.
- Final gate: \`grep -rni boutique --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude=pnpm-lock.yaml --exclude-dir=customer-frontend .\` must only show the README attribution lines and the root package.json "description" (upstream provenance). Report any other hit in remainingBoutiqueHits.
OWN: every file named above, pnpm-lock.yaml, and any other file that contains "boutique" except: .env.local files, customer-frontend/**, prompts/**, LICENSE, the attribution lines. Do not change behaviour, only names/strings.`,
  { label: 'rename', phase: 'Rename', model: 'haiku', schema: RENAME },
)
if (!rename || !rename.ok) {
  return { stoppedAt: 'Rename', rename }
}
await agent(
  `Repo ${args.repo}. Run exactly: \`git add -A && git commit -q -m "Rename boutique to insieme" && git log --oneline -1\`. Do nothing else. Return the commit line.`,
  { label: 'checkpoint:rename', phase: 'Rename', model: 'haiku', effort: 'low' },
)

// ---------------------------------------------------------------- Phase 2
phase('Foundation')
log('Backend + frontend foundation + assets in parallel')
const LOGOS = `convenios/logo-afinia.png, convenios/logo-cabify.png, convenios/logo-claro.png, convenios/logo-compensar.png, convenios/logo-gasnatural.png, convenios/logo-icetex.png, convenios/logo-olivos.png, convenios/logo-superricas.png, convenios/logo-vanti.png, convenios/op-movistar.svg, convenios/op-etb.png`

const foundation = await parallel([
  () =>
    agent(
      `${COMMON}

ROLE: backend engineer. Implement the plan sections "Contrato de API", "Backend — Datos / Catálogo y facturas / Órdenes", "Integración con integration-backend" and the backend "Tests" (EXCEPT everything under "Liquidación" / settlement / events / SETTLED statuses / GET /admin/orders, which a later agent owns).
Key points (details in the plan):
- backend/data/catalog.json: 12 categories + 36 companies transcribed from customer-frontend/js/screens/servicios.js (lines ~20-83) — cross-check ids/names with ${args.integration}/app/data/catalog.json (same ids). Fixed UUID v4 per product (generate once with \`node -e "console.log(require('crypto').randomUUID())"\` or similar), slug = company id, requiresManualAmount = partial, fixedAmount, minAmount 1000, maxAmount null, sortOrder, logo = one of these paths when the prototype has a logo for that company (another agent copies the files): ${LOGOS}; otherwise null. metadata: { logoFit } when the prototype defines it.
- Migrations 20261016120000_insieme_catalog_schema.js (products alter + categories table + orderItems.details jsonb) and 20261016120100_insieme_catalog_seed.js (delete the 6 virtue products by id, insert categories+products via require('../data/catalog.json')). Keep the old 2023 seed file untouched.
- Product model/service/controller + Category model, GET /catalog, GET /products?type=&category=, Product.$formatJson adds convenio = slug and never exposes nothing sensitive.
- shared/src/types.ts (contract types, exported from shared/src/index.ts) and shared/src/validation.ts (REF_REGEX, billLookupSchema, catalogQuerySchema, orderDetailsSchema, orderItemSchema, createOrderSchema with products.length(1), instantBuySchema). Keep oneClickSetupSchema/finishOrderSchema/setupFinishSchema/walletAddressUrlSchema unchanged.
- backend/src/bill/simulate.ts (simulateBill = exact port of billFor: h=7; h=(h*31+code)%100003 over slug+ref; 18000+(h%260)*900; zeros → null; fixedAmount wins) + simulateInvoiceDetails(slug, ref1) → { holder, concept, dueDate } deterministic from the same hash (fixed lists of plausible Colombian names and concepts; dueDate = '2026-11-01' plus hash%30 days, ISO date). bill/service.ts with resolveBill(product, ref1) (integration client first, local fallback), lookup() and priceOrderItem(). IMPORTANT (contract change): integration-backend now returns a RANDOM amount per call ($80.000–$350.000), so the amount cannot be re-derived at order time. lookup() must store a BillSnapshot ({amount, partial, minAmount, maxAmount, dueDate, holder, concept}) in an InMemoryCache (from backend/src/lib) keyed '<productId>:<ref1>' with a 30 min TTL (register 'billSnapshotCache' in the container like oneClickCache); priceOrderItem() must use that snapshot as the authoritative bill (non-partial: amount absent or === snapshot.amount; partial: max(1000,minAmount) ≤ amount ≤ snapshot.amount) and only call resolveBill() again when no snapshot exists; store holder/concept/dueDate from the snapshot into details. Tests must cover: snapshot reused by priceOrderItem, expired/missing snapshot → re-resolve; bill/controller.ts; route POST /bills/lookup. Not-found / invalid reference → BadRequest('Invalid input', { ref1: '<detail>' }) (HTTP 400) with the Spanish message 'No encontramos una factura pendiente con esta referencia' for zeros.
- NOTE the teammate updated integration-backend (see its README in the reference copy at ${args.integration}, already updated to its latest commit): amounts are random per call; response shape unchanged.
- backend/src/integration/client.ts (axios, X-API-Key, timeout 6s, IntegrationUnavailable for network/timeout, HttpError with status+detail for 4xx/5xx) and backend/src/catalog/sync.ts (upsert products/categories by slug/id; never delete; catalogSource + lastSyncAt in memory; run after migrations in App.startServer without blocking, then every 10 min with .unref()). env.ts: INTEGRATION_API_URL optional url, INTEGRATION_API_KEY default 'insieme-dev-key'. GET /config adds catalogSource and lastSyncAt. local/docker-compose.app.yml backend environment: INTEGRATION_API_URL: \${INTEGRATION_API_URL:-http://host.docker.internal:8000}, INTEGRATION_API_KEY: \${INTEGRATION_API_KEY:-insieme-dev-key}.
- Orders: OrderItem.details jsonb + product relation + conditional price snapshot; Order model: drop phantom fields, user relation joins users.id; OrderService.get withGraphFetched('[orderItems.product, payments]') with payments restricted to id,status,quoteId,incomingPaymentUrl,createdAt,updatedAt; OrderController.createPricedOrder used by create and instantBuy, both responses include orderId; validate() joins error paths with '.'. Register new services/controllers in container.ts (awilix CLASSIC: constructor parameter names must equal registration names). Routes in app.ts registered before the '*' 404 handler.
- backend/Dockerfile.prod: add \`COPY --from=builder /app/backend/data ./backend/data\` in the runner stage.
- Tests: update tests/product/controller.test.ts (seedCatalog helper → 36 products, 12 categories, ?category=gas filter), tests/order/service.test.ts (toMatchObject; assert payments has no continueToken), tests/mocks.ts; add tests/helpers.ts seedCatalog(knex); new tests/bill/simulate.test.ts, tests/bill/service.test.ts (inject a fake IIntegrationClient: 200 mapping, 404 → BadRequest errors.ref1, 422 → BadRequest, IntegrationUnavailable → local fallback), tests/catalog/sync.test.ts, tests/order/controller.test.ts (node-mocks-http like the product controller test; spy/mocks for openPayments.preparePayment returning { interact: { redirect: 'https://wallet.example/consent' } } and for tokenCache if needed; 400 on 2 items / bad ref1 (key products.0.details.ref1); 201 with manual amount; details persisted; total === amount; orderId present).
EXIT CRITERIA (must all pass): \`npx -y pnpm@9.1.4 --filter @insieme/shared build && npx -y pnpm@9.1.4 --filter @insieme/backend build\`; \`npx -y pnpm@9.1.4 --filter @insieme/backend test\` green (testcontainers, Docker is up); \`npx eslint --max-warnings=0 backend shared\` clean. Optional live smoke: \`npx -y pnpm@9.1.4 local:up\` then start the backend with the DATABASE_URL prefix trick and curl GET /catalog and POST /bills/lookup; stop it afterwards.
OWN: backend/src/** EXCEPT backend/src/settlement/** (do not create it); backend/migrations/2026*; backend/data/**; backend/tests/** except tests/settlement/**; backend/Dockerfile.prod; backend/package.json (only if a devDependency is strictly needed — avoid); shared/src/**; local/docker-compose.app.yml (only the two INTEGRATION_* env lines).
DO NOT TOUCH: frontend/**, backend/images/**, README/docs, package.json root, env files.`,
      { label: 'backend', phase: 'Foundation', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}

ROLE: frontend engineer, package P0 "Bootstrap" from the plan section "Frontend" (routes, deletions, design tokens, app shell, typed stubs). Other agents will fill the stubs in parallel later, so the stub SIGNATURES are the contract: define them carefully and keep them compiling.
Do:
- Deletions listed in the plan ("Borrar"): products/orders pages, cart page + components (first MOVE app/cart/components/one-click-setup.tsx to components/payment/one-click-setup-dialog.tsx keeping it compiling), checkout/index.tsx + checkout/components/*, decorative components (bird, bubbles, header, navigation, shopping-cart-popover, page-header, theme-toggle, animated-text), layouts/base.tsx, hooks use-cart-store/use-products-query/use-product-query, lib/stores/cart-store.ts, src/fonts/** and their imports in main.tsx, unused icon exports in icons.tsx (keep X, XCircle, ArrowRightLong, PayWithInterledgerMark, OpenPaymentsMark; replace Logo with a placeholder that the design-system agent will restyle).
- frontend/index.html: lang es, title 'Insieme Payments', Google Fonts link exactly as customer-frontend/index.html (Roboto 400;500;600;700 + Figtree 500), keep /env.js and the root div. New simple public/favicon.svg (blue #3d4b66 rounded square with white 'IP').
- tailwind.config.cjs rewritten per plan: content ['./src/**/*.{ts,tsx}','./index.html'], theme.extend with the prototype tokens (colors blue.normal/hover/btn/darker/light-hover/light-active, neutral.darker/normal/light-active, lime DEFAULT/hover/text, magenta, success DEFAULT/dark, sheet #f5f5f5, page #e9ebef, panel #eff2f3, text01 #333), fontFamily sans Roboto / btn Figtree, fontSize 3xs 8px / 2xs 10px, boxShadow soft/medium/card/sheet, borderRadius pill 100px, keyframes+animation screen-in/sheet-up/fc-pop; plugins at TOP LEVEL: require('tailwindcss-animate'), require('@tailwindcss/forms')({ strategy: 'class' }). No darkMode, no typography plugin.
- src/main.css: RGB-triplet variables from customer-frontend/css/styles.css tokens, base layer (body font-sans bg-page text-neutral-darker antialiased), .no-scrollbar utility, reduced-motion rule; remove all @font-face and old purple variables. Keep Tailwind directives.
- src/main.tsx: remove dark-theme class toggling and font imports; keep the GET /config currency bootstrap.
- src/app/index.tsx: new route table from the plan (/, /servicios, /servicios/categoria/:categoryId, /servicios/pagar/:productId, /facturas, /facturas/nueva, /facturas/guardada, /facturas/:id/editar, /facturas/:id/pagar, /checkout/confirmation (KEEP path; errorElement → Navigate to '/'), /cart/finish (KEEP path), '*' → Navigate to '/'), all children of components/layouts/app-shell.tsx, lazy files exporting Component. Create app/home/routes.tsx, app/servicios/routes.tsx, app/facturas/routes.tsx, trim app/checkout/routes.tsx and app/cart/routes.tsx. Create PLACEHOLDER screens for every lazy route (a Screen with the route name) — the screen agents will replace them.
- components/layouts/app-shell.tsx: centered mobile column (max-w-[420px], bg-white, px-7 pt-6 pb-8, gap-4) on bg-page, Logo top-left and a 'Volver al inicio' link on every route except '/', <Outlet/>.
- Typed STUBS (compile, minimal behaviour) at their final paths with the exact contract from the plan: src/lib/api-types.ts (Category, CatalogProduct, BillLookupResult, OrderItemInput, OrderStatus incl. SETTLED/SETTLEMENT_FAILED, OrderReceipt with settlement+events); hooks/use-catalog-query.ts, hooks/use-bill-lookup-mutation.ts, hooks/use-create-order-mutation.ts (params { walletAddressUrl, products: [OrderItemInput] } → { redirectUrl, orderId }), hooks/use-instant-buy-mutation.ts (same + accessToken/manageUrl → + orderId), hooks/use-order-query.ts (OrderReceipt, keep 2s polling while PROCESSING/COMPLETED), hooks/use-facturas-store.ts, hooks/use-profile-store.ts; lib/stores/payment-draft-store.ts, lib/stores/facturas-store.ts (key 'mb-facturas'), lib/stores/profile-store.ts; lib/money.ts (money, num, digits, formatDateTime, today), lib/assets.ts (resolveAssetUrl, categoryIcon), lib/schemas.ts; components/insieme/types.ts (prop types for Logo, ByPuntored, BackButton, StepTitle, Tip, FloatingInput, MoneyInput, SearchInput, CategoryGrid/CategoryCard, CompanyList/CompanyRow/CompanyLogo, SortSelect, KvRows, ProcessedBy, BankBlock, Receipt, Pasarela, StatusTracker, DialogCard, TitleBox, Actions, Screen) and components/insieme/index.ts barrel exporting minimal stub implementations of each; components/payment/confirm-panel.tsx stub with the props from the plan ({ rows, amount, productId, kind, details, source, facturaId?, enabled, onBack }); components/payment/{bank-block,receipt,pasarela,status-tracker}.tsx may live in components/insieme instead — decide and document in the barrel. Keep existing use-setup-one-click-mutation/use-finish-setup-mutation/use-finish-checkout-mutation (import from '@insieme/shared').
- Write a short frontend/src/CONTRACTS.md listing every stub, its props/signature and which package (P1 design-system, P2 data-stores, P3 servicios+home, P4 facturas, P5 payment+confirmation) implements it.
EXIT CRITERIA: \`npx -y pnpm@9.1.4 --filter @insieme/shared build\` then \`cd frontend && npx tsc --noEmit -p tsconfig.json\` clean; \`npx eslint --max-warnings=0 frontend\` clean; \`npx -y pnpm@9.1.4 --filter @insieme/frontend build\` succeeds; the app boots to the Home placeholder with vite (start it, curl http://localhost:4004/, stop it).
OWN: frontend/** EXCEPT frontend/public/** (assets agent) and EXCEPT frontend/.env* . DO NOT TOUCH backend/**, shared/**, root files, docs.`,
      { label: 'frontend-foundation', phase: 'Foundation', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}

ROLE: assets copier (mechanical). From ${args.repo}/customer-frontend/assets copy into ${args.repo}/frontend/public/assets keeping sub-folder names: assets/icons/* (all), assets/img/* (all), assets/servicios/* (all), assets/facturas/* (all). Do NOT copy assets/pines or assets/paquetes. Then create ${args.repo}/backend/images/convenios/ with these files copied from the prototype: logo-afinia.png, logo-cabify.png, logo-claro.png, logo-compensar.png, logo-gasnatural.png, logo-icetex.png, logo-olivos.png, logo-superricas.png, logo-vanti.png (from assets/servicios/), op-movistar.svg and op-etb.png (from assets/img/). Delete the 12 virtue PNGs in backend/images/ (courage*, kindness*, knowledge*, luck*, opportunity*, patience*). Verify with \`find frontend/public/assets -type f | wc -l\` and \`ls backend/images/convenios\`. Report the counts in summary.
OWN: frontend/public/assets/**, backend/images/**. Nothing else.`,
      { label: 'assets', phase: 'Foundation', model: 'haiku', effort: 'low', schema: RESULT },
    ),
])
const [backend, frontendFoundation, assets] = foundation
log(`Foundation: backend ok=${backend && backend.ok}, frontend ok=${frontendFoundation && frontendFoundation.ok}, assets ok=${assets && assets.ok}`)
await agent(
  `Repo ${args.repo}. Run exactly: \`git add -A && git commit -q -m "Insieme foundation: catalog API, integration-backend client, frontend bootstrap, assets" && git log --oneline -1\`. Do nothing else. Return the commit line.`,
  { label: 'checkpoint:foundation', phase: 'Foundation', model: 'haiku', effort: 'low' },
)

// ---------------------------------------------------------------- Phase 3
phase('Build')
log('Settlement + frontend packages + docs in parallel')
const contractsNote = `The frontend stubs and their contract are documented in frontend/src/CONTRACTS.md and the files under frontend/src (read them before coding; keep every exported name and prop type, extend only in backwards-compatible ways). Foundation summary: ${JSON.stringify(frontendFoundation && frontendFoundation.summary).slice(0, 1500)}. Backend summary: ${JSON.stringify(backend && backend.summary).slice(0, 1500)}.`

const build = await parallel([
  () =>
    agent(
      `${COMMON}

ROLE: backend engineer, plan section "Liquidación" (settlement layer, port of hackathon-med src/providers + orders.js reconcile ideas). Backend summary from the previous phase: ${JSON.stringify(backend && backend.summary).slice(0, 2000)}.
Do:
- Migration backend/migrations/20261016120200_insieme_settlement.js: extend orders.status enum with SETTLED and SETTLEMENT_FAILED (drop and recreate the CHECK constraint the way knex/pg needs), orders.events jsonb NOT NULL default '[]', table settlements (id uuid PK default gen_random_uuid(), orderId uuid FK orders.id cascade UNIQUE, idempotencyKey string UNIQUE, provider string, authCode string, amount float, paidAt timestamp, attempts jsonb, status string SETTLED|FAILED, createdAt/updatedAt). down reverses.
- backend/src/settlement/providers/base.ts (PaymentProvider interface, ProviderReceipt, simulatedProvider factory: latency, dedupe by idempotencyKey, forced failure when SIM_FAIL_PROVIDER includes its id), providers/index.ts (puntored prio 1 all categories; recaudo-b prio 2; breb prio 3 only administracion/educacion; candidates(category); payInvoice with failover collecting attempts), settlement/model.ts (Settlement extends BaseModel, jsonAttributes attempts), settlement/service.ts (SettlementService with logger: settle(order) idempotent via in-memory shared promise per orderId + settlements.idempotencyKey = payments.incomingPaymentUrl unique; on success insert settlement, order status SETTLED, event 'Factura pagada en Colombia' (+ 'Failover: <provider> falló (<error>)' events); on total failure SETTLEMENT_FAILED + 'Error de liquidación: <msg>'); retryPending(): orders COMPLETED without settlement → settle.
- Order model: OrderStatus enum + events (jsonAttributes) + settlement HasOne relation; OrderService.addEvent(orderId, message, trx?) appending {at, message}; OrderService.get graph adds settlement and the public JSON hides settlement.provider/attempts/idempotencyKey (e.g. Settlement.$formatJson strips them unless an internal flag is set) while GET /admin/orders (OrderController.admin, no auth, documented internal) returns id, status, settlement {provider, authCode, attempts}, events. Events: 'Cobro creado; esperando autorización del pagador' in create/instantBuy, 'Pagador autorizó; ejecutando pago saliente' in finish.
- PaymentService.complete(): mark COMPLETED + event 'Fondos recibidos en la billetera de recaudo (incoming payment completado)', then call settlementService.settle(order) outside the transaction (fire-and-forget with error logging). App.processResources: add a 10 s loop calling settlementService.retryPending() (unref). env.ts: SIM_FAIL_PROVIDER optional string. Register settlementService in container.ts (awilix CLASSIC naming).
- Tests backend/tests/settlement/service.test.ts (port of hackathon-med test/flow.test.js ideas): settle once under concurrent calls (same authCode, one 'Factura pagada' event), failover with SIM_FAIL_PROVIDER=puntored (receipt provider != puntored), all providers failing → SETTLEMENT_FAILED and the order still exists, retryPending settles COMPLETED orders. Use the existing helpers (createApp, truncateTables, seedCatalog) — create an order + payment row directly in the test.
EXIT CRITERIA: \`npx -y pnpm@9.1.4 --filter @insieme/backend build\` and \`npx -y pnpm@9.1.4 --filter @insieme/backend test\` fully green (all suites, including the ones written by the previous agent); eslint clean on backend.
OWN: backend/src/settlement/**, backend/src/payment/service.ts, backend/src/app.ts, backend/src/container.ts, backend/src/config/env.ts, backend/src/order/model.ts, backend/src/order/service.ts, backend/src/order/controller.ts, backend/migrations/20261016120200_insieme_settlement.js, backend/tests/settlement/**, backend/tests/order/** (adjust if the graph change breaks them), shared/src/types.ts (add OrderStatus values, settlement and events to OrderReceipt). DO NOT TOUCH frontend/**, other backend files (openIssues instead).`,
      { label: 'settlement', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}
${contractsNote}

ROLE: frontend package P1 "Design system". Implement every component in frontend/src/components/insieme/** per the plan table ("Componentes nuevos ... espejo de App.ui de core.js:165-257") and the prototype CSS (customer-frontend/css/styles.css, servicios.css, facturas.css): Logo, ByPuntored, BackButton, StepTitle, Tip (Radix Popover from ui/popover.tsx, controlled open + 3.5 s auto-close, variants exclamation/alert), FloatingInput (react-hook-form aware via hooks/use-form-field.ts; floating label; leading/trailing/dim/readOnly; error → border-magenta + FormFieldError), MoneyInput (Controller based; displays '$ 10.000' es-CO grouping, stores integer pesos; inputMode numeric; max 9 digits), SearchInput, CategoryGrid/CategoryCard (2 cols, 48px cards, icon + divider + 10px label; plain/selected variants), CompanyList/CompanyRow/CompanyLogo (30px rows, 40x16 logo box object-contain, fallback /assets/servicios/receipt.svg, empty text 'No encontramos empresas o convenios con ese nombre'), SortSelect ('Ordenar por A-Z' / 'Ordenar por Z-A'), KvRows, ProcessedBy, BankBlock (collapsed/open variants with the exact prototype texts and assets; CONTRACT CHANGE from prototype commit 024ca40: the 'Entidad financiera responsable' shows the TEXT 'Interledger Payments' styled like .ilp-brand (10px bold, color #1f6f6b) instead of the Scotiabank Colpatria logo, in both servicios and facturas variants — check customer-frontend/js/screens/servicios.js bank() and facturas.js), Receipt, Pasarela (icon + 'Confirma el estado<br>de tu transacción en el historial' + spinner), StatusTracker (4 steps: 'Autoriza el pago en tu billetera', 'Moviendo el dinero (Open Payments)', 'Fondos recibidos', 'Factura pagada en Colombia'; done/active/pending styles derived from an OrderStatus prop; optional events list), DialogCard, TitleBox, Actions, Screen (animate-screen-in, gray variant). Rewrite ui/button.tsx variants (active lime DEFAULT, disabled blue-btn, dark, solid, outline, secondary, link; keep asChild, aria-label requirement, fullWidth, add grow). Restyle ui/tabs.tsx like .fc-tabs, toasts (error magenta / success), ui/form/form-field.tsx + form.tsx error colors (text-magenta), loader.tsx (remove non-existent classes), sheet.tsx overlay class fix. No data access in this package.
EXIT CRITERIA: \`cd frontend && npx tsc --noEmit -p tsconfig.json\` clean, eslint clean on frontend/src/components, \`npx -y pnpm@9.1.4 --filter @insieme/frontend build\` ok. Render-check at least Button/FloatingInput/ConfirmPanel-less pieces by temporarily importing them in a scratch route is NOT allowed (you don't own routes) — rely on tsc + a careful read.
OWN: frontend/src/components/insieme/**, frontend/src/components/ui/**, frontend/src/components/loader.tsx, frontend/src/components/icons.tsx. DO NOT TOUCH hooks, stores, app/**, components/payment/**, layouts.`,
      { label: 'design-system', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}
${contractsNote}

ROLE: frontend package P2 "Data + stores". Fill the stubs for real: hooks/use-catalog-query.ts (GET /catalog via lib/fetcher.ts; selectors useCategory, useProduct, productsByCategory, searchProducts with NFD normalisation + localeCompare('es')), hooks/use-bill-lookup-mutation.ts (POST /bills/lookup via hooks/use-custom-mutation.ts; APIError field errors preserved), hooks/use-create-order-mutation.ts (POST /orders { walletAddressUrl, products: [item] } → { redirectUrl, orderId }), hooks/use-instant-buy-mutation.ts (POST /orders/instant-buy; on 401 / 'spending limit exceeded' → resetToken + toast, caller falls back to redirect), hooks/use-order-query.ts (GET /orders/:id typed OrderReceipt; refetchInterval 2000 while status is PROCESSING or COMPLETED, stop otherwise), hooks/use-facturas-store.ts + lib/stores/facturas-store.ts (valtioPersist key 'mb-facturas', zod guard on load, actions addFactura/renameFactura/deleteFactura/markPaid, available derived from catalog in a selector), hooks/use-profile-store.ts + lib/stores/profile-store.ts (email, walletAddressUrl), lib/stores/payment-draft-store.ts (productId, ref1, ref2, amount, email, kind, facturaId, returnTo; setDraft/clearDraft), lib/money.ts (money '$10.000' es-CO no decimals; num; digits; formatDateTime 'dd/mm/yyyy H:mm'; today 'dd/mm/yyyy'), lib/assets.ts (resolveAssetUrl: absolute as-is, '/assets/...' as-is, else API_BASE_URL + '/images/' + path; categoryIcon(id) → '/assets/servicios/cat-<id>.svg' with 'otros' fallback; categoryHeadIcon; categoryWhiteIcon), lib/schemas.ts (ref1Schema 6–20 digits, ref2Schema, servicios/facturas form schemas with the plan's Spanish messages). Where the shared package already has the schema (walletAddressUrlSchema, createOrderSchema, instantBuySchema, billLookupSchema, oneClickSetupSchema) import it from '@insieme/shared' instead of duplicating. lib/api-types.ts may re-export types from '@insieme/shared' if they exist there (check shared/src/types.ts).
EXIT CRITERIA: tsc --noEmit clean for frontend, eslint clean on the files you own, vite build ok.
OWN: frontend/src/hooks/** , frontend/src/lib/** (except lib/fetcher.ts, lib/constants.ts, lib/types.ts, lib/utils.ts, lib/valtio-persist.ts which you may only read). DO NOT TOUCH components/**, app/**.`,
      { label: 'data-stores', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}
${contractsNote}

ROLE: frontend package P3 "Servicios + Home" screens. Replace the placeholders with the real screens per the plan ("Pantallas") and the prototype (customer-frontend/js/screens/onboarding.js home section, js/screens/servicios.js, css/servicios.css): app/home/index.tsx (hero with home-ellipse + human svgs, 'Productos disponibles', 3-col cat-card grid with Tip texts; only 'Pago de servicios' navigates to /servicios; the other three aria-disabled + opacity-50 + badge 'Pronto'; ByPuntored footer), app/servicios/index.tsx (sv-facturas card with the three texts and buttons 'Facturas guardadas' → /facturas and '+ Facturas' → /facturas/nueva; 'Busca por empresa o selecciona la categoría del pago a realizar'; SearchInput with dropdown CompanyList of searchProducts; CategoryGrid → /servicios/categoria/:id; dark 'Volver' → /), app/servicios/categoria.tsx (plain CategoryCard header, 'Selecciona o filtra la opción de empresa por el pago', 'Ordenar por:' + SortSelect, SearchInput + CompanyList filtered/sorted, CategoryGrid below, 'Volver'), app/servicios/pagar.tsx (sv-head; 'Ingresa los siguientes datos'; step 1 FloatingInput 'Referencia de pago 1' + BankBlock + Actions with 'Consultar' (pending 'Consultando…'); step 2 shows read-only reference, the lookup's holder/concept/dueDate rows ('Titular', 'Concepto', 'Vence'), MoneyInput 'Valor' readOnly unless partial with Tip 'Tu factura permite<br>pagos parciales' auto-open, error 'Ingresa un valor entre $1.000 y <bill>'; ConfirmPanel with rows Categoría/Empresa/Referencia de pago/Valor, kind 'servicio', source 'servicios'; ?ref1= search param and payment-draft rehydration incl. automatic re-lookup). Use the components from components/insieme, hooks from hooks/**, ConfirmPanel from components/payment/confirm-panel.tsx (its props are fixed; if something is missing, openIssues). Loading states with ui/shimmer, errors via toast.
EXIT CRITERIA: tsc --noEmit clean, eslint clean on your files, vite build ok.
OWN: frontend/src/app/home/**, frontend/src/app/servicios/**. DO NOT TOUCH anything else.`,
      { label: 'servicios-home', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}
${contractsNote}

ROLE: frontend package P4 "Facturas" screens, per the plan and the prototype (customer-frontend/js/screens/facturas.js, css/facturas.css): app/facturas/index.tsx (TitleBox 'Facturas guardadas'; empty state with cat-pago-servicios.svg, 'Aún no tienes facturas guardadas', 'Guarda tus facturas de servicios para pagarlas más rápido la próxima vez.', Actions BackButton + 'Guardar facturas'; tabs 'Disponible para pago' / 'No disponible' via ?tab=; FacturaCard (icon, name, category label, conv, 'Referencia de pago: {ref1}', 'Último pago: {lastPay||—}', 'Ir a pagar' when available, trash/pencil tools); empties 'No tienes facturas disponibles para pago.' / 'No tienes facturas en esta sección.'; delete flow with DialogCard trash-lg 'Si'/'No' then 'Factura eliminada'), app/facturas/nueva.tsx (+ ?view=categorias selectable CategoryGrid; fields and messages exactly as the plan: 'Nombre de la factura', 'Convenio o proveedor' with ConvDropdown of catalog products in the category, 'Referencia No.1', 'Referencia No.2'; validation messages; on save addFactura with productId and navigate /facturas/guardada replace), app/facturas/guardada.tsx (DialogCard check-circle 'Factura guardada<br>exitosamente', BackButton → /facturas), app/facturas/editar.tsx (name only; 'Guardar' enabled when ≥3 chars and changed; missing id → 'La factura ya no existe.' + 'Volver'), app/facturas/pagar.tsx (fc-head; disabled name + ref fields; MoneyInput 'Valor' always editable 1000–5.000.000 with Tip auto-open and error 'El valor debe estar entre $1.000 y $5.000.000'; 'Correo' required with field-mail/edit icons and help text 'Valida tu información, enviaremos el comprobante<br>de la transacción a tu correo'; on mount useBillLookupMutation with the saved ref1 to prefill amount (fallback manual); BankBlock facturas variant; ConfirmPanel rows Categoría/Empresa/Referencia de pago/Valor, kind 'factura', source 'facturas', facturaId; markPaid on successful order creation through ConfirmPanel's onCreated callback if it exists in the contract, else openIssues). Components app/facturas/components/{factura-card,category-selector,conv-dropdown}.tsx.
EXIT CRITERIA: tsc --noEmit clean, eslint clean on your files, vite build ok.
OWN: frontend/src/app/facturas/**. DO NOT TOUCH anything else.`,
      { label: 'facturas', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}
${contractsNote}

ROLE: frontend package P5 "Payment + confirmation". Implement components/payment/confirm-panel.tsx for real (fixed bottom panel per the plan: collapsed 'Ver detalles' + chevron-up; open 'Ocultar detalles' + chevron-down-dark, title 'Confirma la transacción', KvRows, FloatingInput 'Billetera' (walletAddressUrlSchema from '@insieme/shared', prefill from token-store then profile-store, placeholder NEW '$ilp.interledger-test.dev/tu-billetera'), link-button NEW 'Configurar pago en un clic' opening components/payment/one-click-setup-dialog.tsx (Spanish copy NEW: title 'Pago en un clic', fields 'Billetera' and 'Monto máximo', button 'Configurar'; writes payment-draft returnTo before redirect), hint NEW 'Pago en un clic activo para esta billetera: se pagará sin redirección' when token matches; Actions BackButton + 'Confirmar'. First Confirmar opens the panel, second submits: token matches → useInstantBuyMutation → navigate('/checkout/confirmation?orderId=' + orderId); else setDraft + useCreateOrderMutation → in onSuccess set window.location.href = redirectUrl. API field errors → form.setError using the last path segment. Save profile.walletAddressUrl/email on success. Provide an onCreated(orderId) callback prop (used by facturas to markPaid) — add it to the contract if missing and note it in summary). Rewrite app/checkout/confirmation.tsx per the plan (useZodSearchParams + checkoutConfirmationSearchParamsSchema; PATCH only when (interact_ref||result) && status PROCESSING; StatusTracker + events while PROCESSING/COMPLETED with 90 s timeout notice NEW 'La confirmación está tardando; revisa el historial más tarde.'; SETTLED → Receipt '¡Transacción exitosa!' with rows Fecha y hora / Estado 'Aprobada' / Operación 'Pago de servicios' / Numero de autorización (settlement.authCode) / ID transacción (order.id) / Convenio / Referencia de pago 1 (/2) / Total + BankBlock center + Davivienda line + links 'Ver mis facturas' (when draft.source === 'facturas') and 'Volver al inicio'; SETTLEMENT_FAILED → NEW 'No pudimos pagar la factura. Tu dinero queda registrado para reintento/reembolso.'; REJECTED → NEW 'Transacción rechazada' / 'Rechazada'; FAILED → NEW 'Transacción fallida' / 'Fallida' + 'Verifica tus fondos e inténtalo de nuevo.' + 'Intentar de nuevo' → draft.returnTo; clear draft when leaving PROCESSING/COMPLETED into a final state). Edit app/cart/finish.tsx (keep the route logic; Spanish copy NEW '¡Pago en un clic configurado!' / 'La configuración de pago en un clic fue cancelada.' / 'Volviendo a tu pago…'; after setToken navigate to draft.returnTo ?? '/servicios' after 3 s; error → '/'). app/route-schemas.ts stays as is unless needed.
EXIT CRITERIA: tsc --noEmit clean, eslint clean on your files, vite build ok.
OWN: frontend/src/components/payment/**, frontend/src/app/checkout/**, frontend/src/app/cart/**, frontend/src/app/route-schemas.ts. DO NOT TOUCH anything else.`,
      { label: 'payment-confirmation', phase: 'Build', model: 'sonnet', schema: RESULT },
    ),
  () =>
    agent(
      `${COMMON}

ROLE: technical writer (plan section "Documentación y política de IA"). Write:
- README.md (root; keep verbatim the existing upstream attribution lines about interledger/testnet packages/boutique and its commit URL, and the Apache-2.0 note): title 'Insieme Payments', problem/solution adapted from ${args.hackathonMed}/README.md (a Colombian abroad pays a family member's obligation directly; Insieme collects in COP and releases the bill payment only when the incoming payment is completed), table 'Qué es real y qué es simulado' (Open Payments real; integration-backend catalog/validation real-but-dummy with local fallback — its amounts are random per lookup and the backend snapshots them for 30 min; settlement providers simulated; invoices simulated), Correr (pnpm install/build, local:up, dev; docker:up; the three Open Payments env vars go in backend/.env.local; INTEGRATION_API_URL optional pointing to the teammate's integration-backend at :8000), Estructura (backend/, frontend/, shared/, local/, customer-frontend/ (Figma prototype, reference only), docs/, prompts/), Límites conocidos (sin auth, /admin/orders sin auth, sin reembolso automático, marco regulatorio pendiente, kind factura sin tope de factura), link to docs and AI_USAGE.md.
- docs/ARCHITECTURE.md: mermaid sequenceDiagram adapted to THIS repo (Front React → Backend Node (POST /bills/lookup → integration-backend /v1/services/validate with local fallback; POST /orders → incoming payment on the COP collector wallet, quote, interactive outgoing grant → redirect; wallet consent → /checkout/confirmation → PATCH /orders/:id verifyHash + continue grant + outgoing payment; poller polls the incoming payment → COMPLETED → SettlementService → provider router with failover → SETTLED; GET /orders/:id polled by the UI), plus the decisions list (single flow, front never names the provider, source of truth = incoming payment completed, server-authoritative amount, catalog synced from integration-backend with fallback).
- docs/THREAT_MODEL.md: table (threat / mitigation / where in code / status): GNAP hash → verifyHash in backend/src/open-payments/service.ts; callback replay → OrderService.ensurePendingState; double settlement → settlements.idempotencyKey + shared promise; client-side amount manipulation → BillService.resolveBill re-derivation; kind:'factura' bypass → pending; secrets → .env* gitignored + .dockerignore; /admin/orders without auth → pending; grant limits = quote debitAmount (protocol).
- docs/PITCH.md: 5-minute script adapted (demo: Servicios → Vanti → ref 123456 → wallet consent → tracker → receipt).
- AI_USAGE.md (root, per https://interledger.org/es/hackathon/ai-policy/): Tools Used (Claude Code with Claude Fable 5.1 as main agent and Opus/Sonnet/Haiku subagents via dynamic workflows; credits consumed: placeholder '<completar por el equipo>'), Where and How We Used AI (entire project: fork, rename, backend catalog/integration/settlement, frontend migration, docs, tests — list the main paths), files with minimal or no AI (customer-frontend/** exported from Figma, frontend/public/assets/**, LICENSE, code inherited from interledger/testnet such as backend/src/open-payments/service.ts and backend/src/payment/service.ts which were adapted but not rewritten), What We Did Ourselves (product decisions, Figma design, test-wallet setup and Developer Keys, grant approvals, manual verification of every real payment, code review), Prompt Log → prompts/sesion-claude-code.md (already exists: user prompts verbatim) and prompts/workflows/ (the workflow scripts with every subagent prompt; say they are added after each workflow run), Open Payments preparation (team completed the Platzi course / Open Payments guide — placeholder to confirm).
- prompts/README.md explaining the folder.
- backend/README.md and frontend/README.md: short, accurate (scripts, env vars, endpoints list for the backend).
Write in Spanish (AI_USAGE.md may be bilingual headings but Spanish content is fine). Be accurate: read the backend/src tree and frontend/src tree to cite real paths; do not invent endpoints beyond the plan's contract.
OWN: README.md, docs/**, AI_USAGE.md, prompts/README.md, backend/README.md, frontend/README.md. DO NOT TOUCH prompts/sesion-claude-code.md or any code.`,
      { label: 'docs', phase: 'Build', model: 'haiku', schema: RESULT },
    ),
])
const buildSummary = build.map((r, i) => ({ pkg: ['settlement', 'design-system', 'data-stores', 'servicios-home', 'facturas', 'payment-confirmation', 'docs'][i], ok: r && r.ok, openIssues: (r && r.openIssues) || [], summary: r && r.summary }))
log(`Build done: ${buildSummary.map((b) => `${b.pkg}=${b.ok}`).join(', ')}`)
await agent(
  `Repo ${args.repo}. Run exactly: \`git add -A && git commit -q -m "Insieme: settlement layer, Servicios y Facturas UI, docs y AI_USAGE" && git log --oneline -1\`. Do nothing else. Return the commit line.`,
  { label: 'checkpoint:build', phase: 'Build', model: 'haiku', effort: 'low' },
)

// ---------------------------------------------------------------- Phase 4
phase('Verify')
const allIssues = [
  ...((backend && backend.openIssues) || []).map((s) => `[backend] ${s}`),
  ...((frontendFoundation && frontendFoundation.openIssues) || []).map((s) => `[frontend-foundation] ${s}`),
  ...((assets && assets.openIssues) || []).map((s) => `[assets] ${s}`),
  ...buildSummary.flatMap((b) => b.openIssues.map((s) => `[${b.pkg}] ${s}`)),
]
const VERIFY_PROMPT = (round, previous) => `${COMMON}

ROLE: integration lead and verifier (Opus). This is verification round ${round}. You OWN every file in the repo (except env files and customer-frontend/**) and may make small integration fixes directly (glue between packages, missing exports, type mismatches, wiring). Larger defects go to the defects list for Sonnet fixers.
Open issues reported by the package agents (resolve each or turn it into a defect): ${JSON.stringify(allIssues, null, 1)}
${previous ? `Previous round result: ${JSON.stringify(previous).slice(0, 4000)}` : ''}
VERIFY, in order, and record evidence (commands + key output lines) in the evidence array:
1. \`npx -y pnpm@9.1.4 install\` (only if node_modules are inconsistent), \`npx -y pnpm@9.1.4 build\`, \`npx -y pnpm@9.1.4 checks\` (prettier + eslint zero warnings), \`npx -y pnpm@9.1.4 test\` (all backend suites, testcontainers).
2. Grep gate: \`grep -rni boutique --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude=pnpm-lock.yaml --exclude-dir=customer-frontend .\` → only README attribution + root package.json description.
3. Docker: \`npx -y pnpm@9.1.4 local:up\` (Postgres with the insieme_backend role; the old volume was removed before this run) then \`npx -y pnpm@9.1.4 docker:up\` (builds backend+frontend prod images; the compose env_file loads the real Open Payments keys from backend/.env.local — you never read that file). Then: curl GET http://localhost:3004/config (assetCode COP, catalogSource), GET /catalog (12 categories, 36 products, product.convenio present), GET /products/vanti, POST /bills/lookup for vanti with ref1 123456 twice (deterministic amount, holder, concept, dueDate) and with 000000 (400, errors.ref1), POST /orders with an invalid amount (400 errors.amount), GET /admin/orders. Optionally run the teammate's integration-backend from ${args.integration} (python3 -m venv .venv in that folder, pip install -r requirements.txt, uvicorn app.main:app --port 8000) and confirm catalogSource becomes 'integration-backend' after a restart/sync; if Python tooling is missing, note it in manualSteps and keep the local fallback.
4. UI walk-through with the gsd-browser CLI (installed; if the daemon hangs run \`gsd-browser daemon stop\` and retry) at http://localhost:4004 with a mobile-ish viewport (\`gsd-browser set-viewport --width 420 --height 860\`): Home renders 4 cards (3 'Pronto'); Servicios → search 'vanti' → company → step 1 ref 123456 → 'Consultar' → step 2 shows Titular/Concepto/Vence and Valor → 'Confirmar' opens the panel → fill Billetera with ${args.payerWallet} → 'Confirmar' → the browser is redirected to wallet.interledger-test.dev. If the wallet session is logged in, approve the grant; after the redirect to /checkout/confirmation verify the StatusTracker advances and, within ~60 s, the receipt shows 'Aprobada' with an authorization code, and GET /admin/orders shows status SETTLED with provider 'puntored'. If the wallet asks for login, do NOT guess credentials: record in manualSteps that the user must log in and approve, and verify everything up to the redirect. Also verify: Facturas create → guardada → list → editar → pagar screen renders with prefilled amount; 'Configurar pago en un clic' dialog opens; a reload of /checkout/confirmation?orderId=<completed id> keeps showing the receipt (no 500 from ensurePendingState); unknown route → Home.
5. Code review pass over the diff of this run (\`git diff HEAD~3 --stat\` and read the key files): contract mismatches between frontend hooks and backend responses, unsafe exposure of payments.continueToken, Spanish copy fidelity vs the prototype, dead code / leftover boutique UI, missing docs promised by the plan (README, docs/*, AI_USAGE.md, prompts/README.md).
Classify each remaining problem as a defect {file, description, severity}. pass = true only when build/checks/test are green, the API checks pass, and the UI walk-through reaches at least the wallet redirect with no blocker/major defects left.`

let verdict = await agent(VERIFY_PROMPT(1, null), { label: 'verify:1', phase: 'Verify', model: 'opus', effort: 'high', schema: VERIFY })
let round = 1
while (verdict && !verdict.pass && round < 3) {
  const defects = verdict.defects.filter((d) => d.severity !== 'minor')
  if (!defects.length) break
  log(`Round ${round}: ${defects.length} defects → Sonnet fixer`)
  await agent(
    `${COMMON}

ROLE: fixer (Sonnet). Fix every defect below in the repo; you own any file except env files and customer-frontend/**. Keep the plan's contract; keep Spanish copy; keep tests green. After fixing run \`npx -y pnpm@9.1.4 build && npx -y pnpm@9.1.4 checks\` and the backend tests if you touched backend code. Then \`git add -A && git commit -q -m "Fix verification round ${round} defects"\` (you ARE allowed to commit in this role).
DEFECTS: ${JSON.stringify(defects, null, 1)}
Verifier summary: ${verdict.summary}`,
    { label: `fix:${round}`, phase: 'Verify', model: 'sonnet', schema: RESULT },
  )
  round += 1
  verdict = await agent(VERIFY_PROMPT(round, verdict), { label: `verify:${round}`, phase: 'Verify', model: 'opus', effort: 'high', schema: VERIFY })
}

return {
  rename,
  foundation: { backend: backend && backend.summary, frontendFoundation: frontendFoundation && frontendFoundation.summary, assets: assets && assets.summary },
  build: buildSummary,
  verdict,
}