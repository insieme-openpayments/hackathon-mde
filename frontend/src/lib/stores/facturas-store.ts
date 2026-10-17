// Saved invoices ("Facturas guardadas"), persisted under 'mb-facturas'.
// Owner: P2 (data-stores).
import { z } from 'zod'
import { valtioPersist } from '../valtio-persist'
import { loadGuard } from './load-guard'
import type { CatalogProduct } from '../api-types'

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

const facturaItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  cat: z.string(),
  conv: z.string(),
  productId: z.string(),
  ref1: z.string(),
  ref2: z.string(),
  lastPay: z.string().nullable(),
  amount: z.number().nullable()
})

const KEY = 'mb-facturas'
loadGuard(KEY, z.object({ items: z.array(facturaItemSchema) }))

export const facturasStore = valtioPersist<FacturasState>(KEY, {
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

/** Alias of `updateFactura(id, { name })`. */
export function renameFactura(id: string, name: string): void {
  updateFactura(id, { name })
}

/** Alias of `removeFactura`. */
export const deleteFactura = removeFactura

/** A saved invoice is payable only while its convenio exists in the catalog. */
export function isFacturaAvailable(
  item: Pick<FacturaItem, 'productId' | 'conv'>,
  products: CatalogProduct[] | undefined
): boolean {
  if (!products) return true
  return products.some((p) => p.id === item.productId || p.slug === item.conv)
}
