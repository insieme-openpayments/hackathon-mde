// Workflow 2: validación adversarial (dos rondas de agentes Fable con tres lentes + fixers Sonnet, compuerta final Opus).
// Contiene, literalmente, los prompts enviados a cada subagente.
// args: { repo, plan: "<plan aprobado>", payerWallet: "$ilp.interledger-test.dev/91b7c20f", knownMinor: [8 defectos menores de la verificación Opus del workflow 1] }

export const meta = {
  name: 'insieme-adversarial',
  description: 'Two rounds of Fable adversarial validation (3 lenses) with Sonnet fixers, then an Opus final gate',
  phases: [
    { title: 'Ronda 1', detail: '3 Fable skeptics + known minors → Sonnet fixes', model: 'fable' },
    { title: 'Ronda 2', detail: 'Fable re-verify fixes + regressions → Sonnet fixes', model: 'fable' },
    { title: 'Gate', detail: 'Opus final gate: build/checks/test/docker + walk-through', model: 'opus' },
  ],
}

const FINDINGS = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          claim: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          evidence: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
        required: ['file', 'claim', 'severity', 'evidence', 'suggestedFix'],
      },
    },
    verifiedOk: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'findings', 'verifiedOk'],
}
const RESULT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    notFixed: { type: 'array', items: { type: 'string' } },
    ok: { type: 'boolean' },
  },
  required: ['summary', 'filesChanged', 'notFixed', 'ok'],
}
const GATE = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    pass: { type: 'boolean' },
    evidence: { type: 'array', items: { type: 'string' } },
    remaining: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'pass', 'evidence', 'remaining'],
}

const COMMON = `Repo: ${args.repo} (pnpm monorepo: backend/, frontend/, shared/, local/; approved plan with the API contract and Spanish copy at ${args.plan}; the Figma prototype is ${args.repo}/customer-frontend). pnpm is NOT on PATH: use \`npx -y pnpm@9.1.4 <cmd>\` from the repo root. The Docker stack is running: Postgres :15434, backend http://localhost:3004 (prod image), frontend http://localhost:4004 (nginx). Rebuild after code changes with \`npx -y pnpm@9.1.4 docker:up\` (builds images, ~3-5 min). Backend tests: \`npx -y pnpm@9.1.4 test\` (testcontainers). Build+lint: \`npx -y pnpm@9.1.4 build && npx -y pnpm@9.1.4 checks\`.
HARD RULES: never read, print, copy or modify any .env or .env.local file (permission-denied secrets). Never run docker compose down -v, git reset/checkout/stash. Spanish UI copy must stay verbatim from the prototype unless the plan marks it NEW. Format changed files with \`npx prettier --config .prettierrc.js --write <files>\`; eslint runs with --max-warnings=0.`

const LENSES = [
  {
    key: 'contract',
    title: 'API contract, state machine and error flows',
    prompt: `Lens: API contract and backend behaviour. Try to REFUTE that the backend honours the plan's contract: GET /catalog, GET /products, POST /bills/lookup (400 errors.ref1 on zeros / invalid; snapshot cache 30 min; integration-backend mapping and fallback), POST /orders (one item; kind servicio vs factura rules; amount bounds against the snapshot; details persisted; orderId returned), POST /orders/instant-buy, PATCH /orders/:id, GET /orders/:id (no continueToken/continueUri/nonces/provider exposed; events; settlement), GET /admin/orders, GET /config (catalogSource). Attack with curl against http://localhost:3004 (invalid payloads, two items, amount tampering above the bill, kind:'factura' to bypass the cap (document it as accepted but check the bounds), expired snapshot, unknown productId, huge/negative/float amounts, ref with spaces, replaying PATCH, PATCH on a SETTLED order (must not 500 loudly on reload), concurrency on the poller/settlement). Read backend/src and backend/tests; run \`npx -y pnpm@9.1.4 test\` and look for gaps. Do NOT use gsd-browser (another lens owns the browser).`,
  },
  {
    key: 'security',
    title: 'Open Payments security, idempotency, secrets',
    prompt: `Lens: security of the Open Payments flow and the settlement layer. Try to REFUTE: GNAP hash verification on the redirect (backend/src/open-payments/service.ts verifyHash), anti-replay (OrderService.ensurePendingState), the grant limits (debitAmount = quote), incoming payment expiry, token handling (token-store in localStorage for one-click, instant-buy 401 handling), settlement idempotency (settlements.idempotencyKey = incomingPaymentUrl; shared promise; retryPending every 10 s must not double-settle after a restart), SIM_FAIL_PROVIDER failover (unit-tested; reason about Docker), secrets never reaching git/images (.gitignore, .dockerignore, compose env_file), CORS (FRONTEND_URL origin), helmet, input validation, SQL/JSON injection via details jsonb, path traversal on /images, docs/THREAT_MODEL.md accuracy vs the code. Use curl, code reading and \`git ls-files\`; do NOT use gsd-browser.`,
  },
  {
    key: 'ux',
    title: 'UX fidelity vs prototype, copy, docs and AI policy',
    prompt: `Lens: product fidelity. Try to REFUTE that the React app at http://localhost:4004 reproduces the prototype (customer-frontend/js/screens/{onboarding,servicios,facturas}.js + core.js + css) for Home, Servicios (list, search dropdown, categoría, pagar step 1/2 incl. Enter-to-consult, partial tooltip, Titular/Concepto/Vence rows), Facturas (list tabs, delete flow, nueva + categorías, guardada, editar, pagar with email), the confirm panel (wallet field, one-click dialog, hint), /checkout/confirmation (tracker 4 steps, receipt rows incl. 'Interledger Payments' as entidad financiera, rejected/failed/settlement-failed states, reload safety) and /cart/finish, on a 420x860 viewport. You are the ONLY agent allowed to use the gsd-browser CLI (if the daemon hangs: \`gsd-browser daemon stop\`); use \`gsd-browser set-viewport --width 420 --height 860\`, snapshots and screenshots (save to /private/tmp/claude-501/-Users-carlos-orca-hackathon-mde/95cee1ea-6265-4f93-b409-888daf3781a2/scratchpad/adversarial/). You may complete ONE real payment with the payer wallet ${args.payerWallet} (the wallet session is logged in in that Chrome profile; if a login form appears, stop and report it instead of guessing credentials). Also check docs: README.md, docs/ARCHITECTURE.md, docs/THREAT_MODEL.md, docs/PITCH.md, AI_USAGE.md and prompts/ against https://interledger.org/es/hackathon/ai-policy/ requirements (AI_USAGE.md at root with tools, where used, files with minimal AI, prompts folder with real prompts) and against the actual code (no invented endpoints/paths).`,
  },
]

const findPrompt = (lens, round, prior) => `${COMMON}

ROLE: adversarial validator (Fable), round ${round} of 2. ${lens.title}. ${lens.prompt}
${round === 2 ? `Round 1 findings and the fixes applied are listed below. FIRST re-verify each fix that touches your lens (mark it in verifiedOk or re-open it as a finding with fresh evidence), THEN hunt for regressions introduced by the fixes and for anything round 1 missed. Prior: ${JSON.stringify(prior).slice(0, 6000)}` : 'This is round 1: be thorough and skeptical; prefer concrete, reproducible evidence (command + output, file:line, screenshot path) over opinions.'}
Report only real, verified problems (default to NOT reporting when unsure). Severity: blocker = breaks a payment or leaks a secret; major = wrong behaviour/contract/copy a judge would notice; minor = polish. Each finding needs file, claim, evidence, suggestedFix. Do not modify any file.`

const fixPrompt = (round, findings) => `${COMMON}

ROLE: fixer (Sonnet), round ${round}. Fix every finding below (blocker and major first, then minor). Keep the plan's contract and the prototype copy; keep backend tests green (add/adjust tests when you change backend behaviour); keep tsc/eslint/prettier clean. You may touch any file except env files and customer-frontend/**. If a finding is wrong or not worth fixing, list it in notFixed with the reason. When done: \`npx -y pnpm@9.1.4 build && npx -y pnpm@9.1.4 checks\`, backend tests if backend changed, then \`git add -A && git commit -q -m "Adversarial round ${round}: fixes"\` (you ARE allowed to commit), then \`npx -y pnpm@9.1.4 docker:up\` so the running stack reflects the fixes, and confirm GET http://localhost:3004/config and http://localhost:4004/ respond.
FINDINGS: ${JSON.stringify(findings, null, 1)}`

const key = (f) => `${f.file}::${f.claim.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)}`
const seen = new Set()
const history = []

for (const round of [1, 2]) {
  phase(round === 1 ? 'Ronda 1' : 'Ronda 2')
  log(`Fable adversarial round ${round}: 3 lenses in parallel`)
  const prior = round === 2 ? history[0] : null
  const reports = (await parallel(LENSES.map((l) => () => agent(findPrompt(l, round, prior), { label: `fable:${l.key}:${round}`, phase: round === 1 ? 'Ronda 1' : 'Ronda 2', model: 'fable', effort: 'high', schema: FINDINGS })))).filter(Boolean)
  let findings = reports.flatMap((r, i) => r.findings.map((f) => ({ ...f, lens: LENSES[i] ? LENSES[i].key : 'unknown' })))
  const fresh = findings.filter((f) => !seen.has(key(f)))
  fresh.forEach((f) => seen.add(key(f)))
  if (round === 1) {
    for (const m of args.knownMinor || []) {
      const [file, ...rest] = m.split(': ')
      fresh.push({ file, claim: rest.join(': '), severity: 'minor', evidence: 'Opus verification round 1', suggestedFix: rest.join(': '), lens: 'opus-verify' })
    }
  }
  log(`Round ${round}: ${findings.length} reported, ${fresh.length} new (blockers ${fresh.filter((f) => f.severity === 'blocker').length}, major ${fresh.filter((f) => f.severity === 'major').length}, minor ${fresh.filter((f) => f.severity === 'minor').length})`)
  let fix = null
  if (fresh.length) {
    fix = await agent(fixPrompt(round, fresh), { label: `fix:${round}`, phase: round === 1 ? 'Ronda 1' : 'Ronda 2', model: 'sonnet', schema: RESULT })
  } else {
    log(`Round ${round}: nothing new to fix`)
  }
  history.push({ round, reports: reports.map((r, i) => ({ lens: LENSES[i] && LENSES[i].key, summary: r.summary, verifiedOk: r.verifiedOk, findings: r.findings })), fresh, fix })
}

phase('Gate')
log('Opus final gate')
const gate = await agent(
  `${COMMON}

ROLE: release gate (Opus). Two adversarial rounds ran; here is the history (findings, fixes, notFixed): ${JSON.stringify(history).slice(0, 12000)}
Do, with evidence lines: \`npx -y pnpm@9.1.4 build\`, \`npx -y pnpm@9.1.4 checks\`, \`npx -y pnpm@9.1.4 test\`; grep gate \`grep -rni boutique --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude=pnpm-lock.yaml --exclude-dir=customer-frontend --exclude-dir=prompts --exclude='.env*' .\` (only README attribution + root package.json description allowed); \`npx -y pnpm@9.1.4 docker:up\` then curl /config, /catalog (12/36), /bills/lookup vanti 123456 and 000000, GET /admin/orders; a short gsd-browser walk-through at 420x860 (Home → Servicios → vanti → ref 123456 → Consultar → Confirmar → panel with wallet ${args.payerWallet} → redirect reaches wallet.interledger-test.dev; then Facturas list and nueva render). Review git log for the adversarial commits and confirm the working tree is clean (commit any leftover with message 'Adversarial: leftovers' if needed). pass = everything green and no blocker/major remaining. List what remains (minor or manual) in remaining.`,
  { label: 'gate', phase: 'Gate', model: 'opus', effort: 'high', schema: GATE },
)
return { history: history.map((h) => ({ round: h.round, fresh: h.fresh.length, fix: h.fix && h.fix.summary, notFixed: h.fix && h.fix.notFixed })), gate }