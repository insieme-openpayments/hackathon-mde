// Saved invoices ("Facturas guardadas"), persisted under 'mb-facturas'.
// Owner: P2 (data-stores).
import { valtioPersist } from '../valtio-persist'

export interface FacturaItem {
  id: string
  name: string
  /** Category id. */
  cat: string
  /** Convenio slug. */
  conv: string
  productId: string
  ref1: string
  ref2: string
  lastPay: string | null
  amount: number | null
}

export interface FacturasState {
  items: FacturaItem[]
}

export const facturasStore = valtioPersist<FacturasState>('mb-facturas', {
  items: []
})

export function getFactura(id: string): FacturaItem | undefined {
  return facturasStore.items.find((item) => item.id === id)
}

export function addFactura(item: Omit<FacturaItem, 'id'>): FacturaItem {
  const created: FacturaItem = {
    ...item,
    id: crypto.randomUUID()
  }
  facturasStore.items.push(created)
  return created
}

export function updateFactura(id: string, patch: Partial<FacturaItem>): void {
  const item = facturasStore.items.find((i) => i.id === id)
  if (item) Object.assign(item, patch)
}

export function removeFactura(id: string): void {
  facturasStore.items = facturasStore.items.filter((i) => i.id !== id)
}

/** Records the last payment date/amount on a saved invoice. */
export function markPaid(id: string, amount: number, date: string): void {
  updateFactura(id, { lastPay: date, amount })
}
