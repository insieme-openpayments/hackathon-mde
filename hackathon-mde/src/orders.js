// Máquina de estados de la orden. En memoria (mockup); en producción: base de datos transaccional.
// created → awaiting_approval → paying → received → settled | settlement_failed
import crypto from 'node:crypto'
import * as OP from './openpayments.js'
import { payInvoice } from './providers/index.js'

export const orders = new Map()
const log = (o, msg) => o.events.push({ at: new Date().toISOString(), msg })

export async function createOrder({ invoice, payerWallet, baseUrl }) {
  const id = crypto.randomUUID()
  const o = { id, invoice, payerWallet, state: 'created', events: [], receipt: null, dispatching: null }
  const finishUri = `${baseUrl}/finish?order=${id}`
  o.op = await OP.startPayment({ payerWallet, amountCOP: invoice.amountCOP, description: `${invoice.billerName} ${invoice.reference}`, finishUri })
  o.state = 'awaiting_approval'; log(o, 'Cobro creado; esperando autorización del pagador')
  orders.set(id, o)
  return o
}

export async function onRedirect(id, { interactRef, hash }) {
  const o = orders.get(id)
  if (!o || o.state !== 'awaiting_approval') throw new Error('orden inexistente o ya procesada') // anti-replay
  o.state = 'paying'; log(o, 'Pagador autorizó; ejecutando pago saliente')
  try { o.op.outgoingPaymentId = (await OP.finishPayment(o.op, { interactRef, hash })).outgoingPaymentId }
  catch (e) { o.state = 'awaiting_approval'; log(o, `Callback rechazado: ${e.message}`); throw e }
  return o
}

// Idempotente: varias llamadas concurrentes comparten la misma promesa; la clave es el incoming payment.
export function reconcile(o) {
  if (o.state === 'settled' || o.state === 'settlement_failed') return Promise.resolve(o)
  if (o.state !== 'paying' && o.state !== 'received') return Promise.resolve(o)
  return (o.dispatching ??= (async () => {
    try {
      if (o.state === 'paying') {
        if (!(await OP.isIncomingCompleted(o.op))) return o
        o.state = 'received'; log(o, 'Fondos recibidos en la billetera de recaudo (incoming payment completado)')
      }
      const { receipt, attempts } = await payInvoice({
        billerId: o.invoice.billerId, reference: o.invoice.reference,
        amountCOP: o.invoice.amountCOP, idempotencyKey: o.op.incomingPaymentId })
      attempts.forEach((a) => log(o, `Failover: ${a.provider} falló (${a.error})`))
      o.receipt = receipt; o.state = 'settled'; log(o, 'Factura pagada en Colombia')
    } catch (e) { o.state = 'settlement_failed'; log(o, `Error de liquidación: ${e.message}`) }
    return o
  })().finally(() => { o.dispatching = null }))
}

// Vista pública: sin detalle de proveedor (decisión de producto, ver docs/ARCHITECTURE.md)
export const publicView = (o) => ({
  id: o.id, state: o.state, invoice: o.invoice, redirect: o.state === 'awaiting_approval' ? o.op.redirect : undefined,
  debit: o.op.debit, receipt: o.receipt && { authCode: o.receipt.authCode, paidAt: o.receipt.paidAt, amountCOP: o.receipt.amountCOP },
  events: o.events.map((e) => e.msg)
})
