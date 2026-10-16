// Registro + router. Cada adaptador simula la API de una red real;
// para producción se reemplaza el cuerpo de `pay` por la llamada H2H correspondiente.
import { simulatedProvider } from './base.js'
import { BILLERS } from './data.js'

const ALL = ['utilities', 'housing', 'education', 'insurance', 'topup']
export const providers = [
  // Red de corresponsales (convenios de recaudo). Simula el estilo H2H v2: consulta + pago.
  simulatedProvider({ id: 'puntored', categories: ALL, priority: 1, latencyMs: 700 }),
  // Redes de recaudo similares (p. ej. Efecty / Baloto / Gana) como respaldo
  simulatedProvider({ id: 'recaudo-b', categories: ['utilities', 'housing', 'topup', 'insurance'], priority: 2, latencyMs: 900 }),
  // Pago directo a cuenta/llave (Bre-B / Transfiya) para facturadores que reciben por transferencia
  simulatedProvider({ id: 'breb', categories: ['housing', 'education'], priority: 3, latencyMs: 500 })
]

export const listBillers = (q = '') =>
  BILLERS.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))

const billerOf = (id) => BILLERS.find((b) => b.id === id)

export async function lookupInvoice(billerId, reference) {
  const biller = billerOf(billerId)
  if (!biller) return null
  for (const p of candidates(biller)) {
    try { const inv = await p.lookupInvoice({ billerId, reference }); if (inv) return { ...inv, billerName: biller.name } } catch { /* siguiente */ }
  }
  return null
}

function candidates(biller) {
  return providers.filter((p) => p.categories.includes(biller.category)).sort((a, b) => a.priority - b.priority)
}

// Ejecuta el pago con failover. La misma idempotencyKey en todos los intentos.
export async function payInvoice({ billerId, reference, amountCOP, idempotencyKey }) {
  const biller = billerOf(billerId)
  const attempts = []
  for (const p of candidates(biller)) {
    try {
      const receipt = await p.pay({ billerId, reference, amountCOP, idempotencyKey })
      return { receipt, attempts }
    } catch (e) { attempts.push({ provider: p.id, error: e.message }) }
  }
  const err = new Error('Ningún proveedor pudo ejecutar el pago'); err.attempts = attempts; throw err
}
