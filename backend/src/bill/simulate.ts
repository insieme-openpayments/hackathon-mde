export interface InvoiceDetails {
  holder: string
  concept: string
  dueDate: string
}

const HOLDERS = [
  'María Fernanda Gómez Restrepo',
  'Carlos Andrés Rodríguez Peña',
  'Luz Marina Hernández Ortiz',
  'Jorge Iván Ramírez Cardona',
  'Ana Milena Vargas Torres',
  'Juan David Martínez Salazar',
  'Sandra Patricia López Giraldo',
  'Luis Fernando Castaño Mejía',
  'Claudia Marcela Moreno Duque',
  'Diego Alejandro Suárez Bedoya',
  'Gloria Esperanza Jiménez Rojas',
  'Óscar Eduardo Patiño Zapata',
  'Paola Andrea Aristizábal Cruz',
  'Hernán Darío Quintero Arango',
  'Beatriz Elena Osorio Valencia',
  'Camilo Ernesto Parra Londoño'
]

const CONCEPTS = [
  'Factura mensual – octubre 2026',
  'Factura mensual – septiembre 2026',
  'Cuota del periodo vigente',
  'Consumo del último ciclo de facturación',
  'Saldo pendiente del periodo anterior',
  'Cargo fijo más consumo del mes',
  'Cuota de administración del mes',
  'Factura bimestral – septiembre y octubre 2026'
]

const BASE_DUE_DATE = Date.UTC(2026, 10, 1)
const DAY_MS = 24 * 60 * 60 * 1000

/** Same rolling hash as `billFor` in customer-frontend/js/screens/servicios.js */
export function hashOf(slug: string, ref1: string): number {
  const s = String(slug) + String(ref1 || '')
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003
  return h
}

/**
 * Deterministic bill amount for a (company, reference) pair: 18.000 - 251.100
 * COP in steps of 900. A reference made only of zeros means "no pending
 * invoice" (null). A company with a fixed amount always wins.
 */
export function simulateBill(
  slug: string,
  ref1: string,
  fixedAmount?: number | null
): number | null {
  if (/^0+$/.test(String(ref1 || ''))) return null
  if (fixedAmount) return fixedAmount
  return 18000 + (hashOf(slug, ref1) % 260) * 900
}

/** Deterministic holder, concept and due date derived from the same hash. */
export function simulateInvoiceDetails(
  slug: string,
  ref1: string
): InvoiceDetails {
  const h = hashOf(slug, ref1)
  const due = new Date(BASE_DUE_DATE + (h % 30) * DAY_MS)
  return {
    holder: HOLDERS[h % HOLDERS.length],
    concept: CONCEPTS[Math.floor(h / HOLDERS.length) % CONCEPTS.length],
    dueDate: due.toISOString().slice(0, 10)
  }
}
