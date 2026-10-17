// Saved invoices ("Facturas guardadas"), persisted under 'mb-facturas'.
// Since accounts, the source of truth is the server (GET /me/bills); this
// local store only holds legacy items waiting for the one-time import.
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

/**
 * Legacy local items (before accounts). With a session the server is the
 * source of truth; these are only imported once and then cleared.
 */
export function clearLocalFacturas(): void {
  facturasStore.items = []
}

/** A saved invoice is payable only while its convenio exists in the catalog. */
export function isFacturaAvailable(
  item: Pick<FacturaItem, 'productId' | 'conv'>,
  products: CatalogProduct[] | undefined
): boolean {
  if (!products) return true
  return products.some((p) => p.id === item.productId || p.slug === item.conv)
}
