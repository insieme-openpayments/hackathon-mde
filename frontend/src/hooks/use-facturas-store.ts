import { useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'
import type { SavedBill } from '@insieme/shared'
import {
  facturasStore,
  isFacturaAvailable,
  type FacturaItem
} from '@/lib/stores/facturas-store'
import { fetcher } from '@/lib/fetcher.ts'
import { authStore } from '@/lib/stores/auth-store.ts'
import { formatDateTime } from '@/lib/money.ts'
import type { CatalogProduct } from '@/lib/api-types.ts'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useSession } from '@/hooks/use-auth.ts'
import {
  SAVED_BILLS_KEY,
  useRemoveBillMutation,
  useSavedBills,
  useSaveBillMutation,
  useUpdateBillMutation
} from '@/hooks/use-saved-bills.ts'
import { toast } from '@/hooks/use-toast.tsx'

/** SavedBill (server) -> FacturaItem; cat and conv come from the catalog. */
export function billToFactura(
  bill: SavedBill,
  products: CatalogProduct[] | undefined
): FacturaItem {
  const product = products?.find((p) => p.id === bill.productId)
  return {
    id: bill.id,
    name: bill.name,
    cat: product?.category ?? '',
    conv: product?.slug ?? '',
    productId: bill.productId,
    ref1: bill.ref1,
    ref2: bill.ref2 ?? '',
    lastPay: bill.lastPaidAt
      ? formatDateTime(bill.lastPaidAt).split(' ')[0]
      : null,
    amount: bill.lastAmount
  }
}

let importing = false

/** Parses the legacy dd/mm/aaaa label of the last payment. */
function parseLocalDate(value: string | null | undefined): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value ?? '')
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12)
  return Number.isNaN(d.getTime()) ? null : d
}

/** One-time import of the legacy 'mb-facturas' items into the account. */
function useImportLocalFacturas(enabled: boolean) {
  const queryClient = useQueryClient()
  const { items } = useSnapshot(facturasStore)
  const pending = items.length
  useEffect(() => {
    if (!enabled || pending === 0 || importing) return
    importing = true
    const legacy = facturasStore.items.map((i) => ({ ...i }))
    void (async () => {
      let imported = 0
      const doneIds = new Set<string>()
      const known = new Set<string>()
      try {
        const existing = await fetcher<SavedBill[]>('/me/bills')
        for (const b of existing.result) known.add(b.id)
      } catch {
        // Expired session or no network: keep the local items untouched.
        importing = false
        return
      }
      let failed = 0
      for (const item of legacy) {
        if (!authStore.token) break
        try {
          const res = await fetcher<SavedBill>('/me/bills', {
            method: 'POST',
            body: JSON.stringify({
              productId: item.productId,
              name: item.name,
              ref1: item.ref1,
              ...(item.ref2 ? { ref2: item.ref2 } : {})
            })
          })
          const bill = res.result
          doneIds.add(item.id)
          // The server answers 200 with the existing bill on duplicates.
          if (known.has(bill.id)) continue
          known.add(bill.id)
          imported += 1
          const paidAt = parseLocalDate(item.lastPay)
          if (item.amount && paidAt) {
            try {
              await fetcher(`/me/bills/${bill.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  lastAmount: item.amount,
                  lastPaidAt: paidAt.toISOString()
                })
              })
            } catch {
              // Keeping the history is best-effort.
            }
          }
        } catch {
          // Kept locally so a later attempt can retry it.
          failed += 1
        }
      }
      // Remove only the items that reached the account.
      facturasStore.items = facturasStore.items.filter(
        (i) => !doneIds.has(i.id)
      )
      importing = false
      await queryClient.invalidateQueries({ queryKey: SAVED_BILLS_KEY })
      if (failed > 0) {
        toast({
          description: `No pudimos importar ${failed} ${failed === 1 ? 'factura' : 'facturas'}; siguen guardadas en este dispositivo`
        })
      }
      if (imported > 0) {
        toast({
          description: `Importamos ${imported} ${imported === 1 ? 'factura guardada' : 'facturas guardadas'} en este dispositivo`
        })
      }
    })()
  }, [enabled, pending, queryClient])
}

/** Saved invoices of the signed-in account (server is the source of truth). */
export function useFacturasStore() {
  const { isLoggedIn } = useSession()
  const bills = useSavedBills()
  const { data: catalog } = useCatalogQuery()
  const products = catalog?.result.products
  useImportLocalFacturas(isLoggedIn)
  const list = bills.data?.result
  const items = useMemo(
    () => (list ?? []).map((b) => billToFactura(b, products)),
    [list, products]
  )
  return {
    items,
    isLoggedIn,
    isLoading: isLoggedIn && bills.isLoading,
    isError: bills.isError
  }
}

export type FacturaWithAvailability = FacturaItem & { available: boolean }

/** Saved invoices with `available` derived from the catalog. */
export function useFacturasWithAvailability(): FacturaWithAvailability[] {
  const { items } = useFacturasStore()
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

/** Async mutations over /me/bills (add, update, remove, markPaid). */
export function useFacturaActions() {
  const save = useSaveBillMutation()
  const update = useUpdateBillMutation()
  const remove = useRemoveBillMutation()

  const addFactura = save.mutateAsync
  const updateFactura = update.mutateAsync
  const removeFactura = remove.mutateAsync
  /** Records the last payment on a saved invoice (PATCH lastAmount/lastPaidAt). */
  const markPaid = useCallback(
    async (id: string, amount: number, date: Date = new Date()) =>
      await update.mutateAsync({
        id,
        lastAmount: amount,
        lastPaidAt: date.toISOString()
      }),
    [update.mutateAsync] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    addFactura,
    updateFactura,
    removeFactura,
    markPaid,
    saving: save.isPending,
    updating: update.isPending,
    removing: remove.isPending
  }
}
