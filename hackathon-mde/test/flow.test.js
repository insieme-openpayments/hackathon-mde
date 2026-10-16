import test from 'node:test'
import assert from 'node:assert/strict'
process.env.SIMULATE_OP = '1'
const { createOrder, onRedirect, reconcile } = await import('../src/orders.js')
const { lookupInvoice } = await import('../src/providers/index.js')

const mk = async () => createOrder({ invoice: await lookupInvoice('epm', '12345678'), payerWallet: 'sim', baseUrl: 'http://x' })

test('flujo completo y recibo', async () => {
  const o = await mk(); await onRedirect(o.id, { interactRef: 'sim', hash: 'sim' })
  await reconcile(o); assert.equal(o.state, 'settled'); assert.ok(o.receipt.authCode)
})
test('reconcile concurrente paga una sola vez (idempotencia)', async () => {
  const o = await mk(); await onRedirect(o.id, { interactRef: 'sim', hash: 'sim' })
  const [a, b] = await Promise.all([reconcile(o), reconcile(o)])
  assert.equal(a.receipt.authCode, b.receipt.authCode)
  assert.equal(o.events.filter((e) => e.msg.startsWith('Factura pagada')).length, 1)
})
test('anti-replay: el callback solo sirve una vez', async () => {
  const o = await mk(); await onRedirect(o.id, { interactRef: 'sim', hash: 'sim' })
  await assert.rejects(onRedirect(o.id, { interactRef: 'sim', hash: 'sim' }))
})
test('failover: si PuntoRed cae, paga otro proveedor', async () => {
  process.env.SIM_FAIL_PROVIDER = 'puntored'
  const o = await mk(); await onRedirect(o.id, { interactRef: 'sim', hash: 'sim' }); await reconcile(o)
  assert.equal(o.state, 'settled'); assert.notEqual(o.receipt.provider, 'puntored')
  process.env.SIM_FAIL_PROVIDER = ''
})
test('si todos fallan, queda settlement_failed (no se pierde la orden)', async () => {
  process.env.SIM_FAIL_PROVIDER = 'puntored,recaudo-b,breb'
  const o = await mk(); await onRedirect(o.id, { interactRef: 'sim', hash: 'sim' }); await reconcile(o)
  assert.equal(o.state, 'settlement_failed'); process.env.SIM_FAIL_PROVIDER = ''
})
