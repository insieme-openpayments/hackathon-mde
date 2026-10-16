// Flujo Open Payments real (SDK oficial) + modo simulado solo para ensayar la UI.
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createAuthenticatedClient, isFinalizedGrant } from '@interledger/open-payments'
import { verifyHash } from './gnap.js'

const SIM = process.env.SIMULATE_OP === '1'
export const isSimulated = SIM
let clientP
const client = () => (clientP ??= createAuthenticatedClient({
  walletAddressUrl: process.env.CLIENT_WALLET,
  keyId: process.env.KEY_ID,
  privateKey: fs.readFileSync(process.env.PRIVATE_KEY_PATH || './private.key', 'utf8')
}))
const toMinor = (a, scale) => String(Math.round(a * 10 ** scale))

// 1) Cobro (incoming payment) + cotización + grant interactivo para el pagador.
export async function startPayment({ payerWallet, amountCOP, description, finishUri }) {
  const clientNonce = crypto.randomUUID()
  if (SIM) {
    const id = crypto.randomUUID()
    return { clientNonce, serverNonce: 'sim', incomingPaymentId: `sim://incoming/${id}`, quoteId: `sim://quote/${id}`,
      debit: { value: String(amountCOP * 100), assetCode: 'COP', assetScale: 2 }, grantEndpoint: 'sim',
      continue: { uri: 'sim', token: 'sim' }, redirect: `${finishUri}&interact_ref=sim&hash=sim` }
  }
  const c = await client()
  const payer = await c.walletAddress.get({ url: payerWallet })
  const collector = await c.walletAddress.get({ url: process.env.COLLECTOR_WALLET })

  const inGrant = await c.grant.request({ url: collector.authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'complete'] }] } })
  if (!isFinalizedGrant(inGrant)) throw new Error('grant incoming-payment no finalizado')
  const incoming = await c.incomingPayment.create(
    { url: collector.resourceServer, accessToken: inGrant.access_token.value },
    { walletAddress: collector.id,
      incomingAmount: { value: toMinor(amountCOP, collector.assetScale), assetCode: collector.assetCode, assetScale: collector.assetScale },
      metadata: { description }, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() })

  const qGrant = await c.grant.request({ url: payer.authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } })
  if (!isFinalizedGrant(qGrant)) throw new Error('grant quote no finalizado')
  const quote = await c.quote.create({ url: payer.resourceServer, accessToken: qGrant.access_token.value },
    { walletAddress: payer.id, receiver: incoming.id, method: 'ilp' })

  const out = await c.grant.request({ url: payer.authServer }, {
    access_token: { access: [{ type: 'outgoing-payment', actions: ['create', 'read'], identifier: payer.id,
      limits: { debitAmount: quote.debitAmount } }] }, // el pagador autoriza SOLO este monto
    interact: { start: ['redirect'], finish: { method: 'redirect', uri: finishUri, nonce: clientNonce } }
  })
  if (isFinalizedGrant(out)) throw new Error('se esperaba grant interactivo')
  return { clientNonce, serverNonce: out.interact.finish, incomingPaymentId: incoming.id, incomingToken: inGrant.access_token.value,
    quoteId: quote.id, debit: quote.debitAmount, payerResource: payer.resourceServer, payerId: payer.id,
    grantEndpoint: payer.authServer, continue: { uri: out.continue.uri, token: out.continue.access_token.value },
    redirect: out.interact.redirect }
}

// 2) Callback del redirect: verifica hash, continúa el grant y ejecuta el pago saliente.
export async function finishPayment(op, { interactRef, hash }) {
  if (SIM) return { outgoingPaymentId: `sim://outgoing/${crypto.randomUUID()}` }
  const ok = verifyHash({ clientNonce: op.clientNonce, serverNonce: op.serverNonce, interactRef, grantEndpoint: op.grantEndpoint }, hash)
  if (!ok) throw new Error('hash GNAP inválido: callback rechazado')
  const c = await client()
  const g = await c.grant.continue({ url: op.continue.uri, accessToken: op.continue.token }, { interact_ref: interactRef })
  if (!isFinalizedGrant(g)) throw new Error('grant no aprobado por el pagador')
  const o = await c.outgoingPayment.create({ url: op.payerResource, accessToken: g.access_token.value },
    { walletAddress: op.payerId, quoteId: op.quoteId, metadata: { description: 'Insieme — pago de factura' } })
  return { outgoingPaymentId: o.id }
}

// 3) La fuente de verdad para liberar el pago al corresponsal: el incoming payment del recaudador.
export async function isIncomingCompleted(op) {
  if (SIM) return true
  const c = await client()
  const inc = await c.incomingPayment.get({ url: op.incomingPaymentId, accessToken: op.incomingToken })
  return inc.completed === true || BigInt(inc.receivedAmount.value) >= BigInt(inc.incomingAmount.value)
}
