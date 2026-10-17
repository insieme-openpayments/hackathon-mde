import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import {
  facturasStore,
  isFacturaAvailable,
  type FacturaItem
} from '@/lib/stores/facturas-store'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'

export function useFacturasStore() {
  return useSnapshot(facturasStore)
}

export type FacturaWithAvailability = FacturaItem & { available: boolean }

/** Saved invoices with `available` derived from the catalog. */
export function useFacturasWithAvailability(): FacturaWithAvailability[] {
  const { items } = useSnapshot(facturasStore)
  const { data } = useCatalogQuery()
  const products = data?.result.products
  return useMemo(
    () =>
      items.map((item) => ({
        ...item,
        available: isFacturaAvailable(item, products)
      })),
    [items, products]
  )
}
