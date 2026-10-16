// Contrato que debe cumplir cualquier red de recaudo / pago en Colombia.
// El front NUNCA ve qué proveedor ejecuta: el router elige y hace failover.
/**
 * @typedef {Object} Receipt
 * @property {string} provider   id interno (solo visible en /api/admin)
 * @property {string} authCode   código de autorización del recaudo
 * @property {string} idempotencyKey
 * @property {string} paidAt
 *
 * @typedef {Object} PaymentProvider
 * @property {string} id
 * @property {string[]} categories      categorías de facturador que cubre
 * @property {number} priority          menor = se intenta primero
 * @property {(ref:{billerId:string,reference:string}) => Promise<object|null>} lookupInvoice
 * @property {(req:{billerId:string,reference:string,amountCOP:number,idempotencyKey:string}) => Promise<Receipt>} pay
 */
import crypto from 'node:crypto'
import { INVOICES } from './data.js'

// Fábrica de adaptador simulado: latencia, idempotencia y fallo forzable.
export function simulatedProvider({ id, categories, priority, latencyMs = 600, label }) {
  const seen = new Map() // idempotencyKey -> receipt (un proveedor real también deduplica)
  return {
    id, categories, priority, label,
    async lookupInvoice({ billerId, reference }) {
      await sleep(latencyMs / 3)
      const inv = INVOICES[`${billerId}:${reference}`]
      return inv ? { billerId, reference, ...inv } : null
    },
    async pay({ billerId, reference, amountCOP, idempotencyKey }) {
      await sleep(latencyMs)
      if ((process.env.SIM_FAIL_PROVIDER || '').split(',').includes(id)) {
        throw new Error(`[sim] ${id} no disponible`)
      }
      if (seen.has(idempotencyKey)) return seen.get(idempotencyKey)
      const receipt = {
        provider: id,
        authCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
        idempotencyKey, billerId, reference, amountCOP,
        paidAt: new Date().toISOString()
      }
      seen.set(idempotencyKey, receipt)
      return receipt
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
