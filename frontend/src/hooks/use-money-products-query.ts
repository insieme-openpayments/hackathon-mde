import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher.ts'
import type { CatalogProduct } from '@/lib/api-types.ts'

async function listByType(type: 'giro' | 'transferencia') {
  try {
    const res = await fetcher<CatalogProduct[]>('/products?type=' + type, {
      method: 'GET'
    })
    return res.result
  } catch {
    return []
  }
}

/** Products of type giro (Efecty) and transferencia (Bre-B). Never rejects. */
export function useMoneyProductsQuery() {
  return useQuery({
    queryKey: ['money-products'],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const [giros, transfers] = await Promise.all([
        listByType('giro'),
        listByType('transferencia')
      ])
      return [...giros, ...transfers]
    },
    staleTime: 5 * 60 * 1000
  })
}

export type MoneyProductSlug = 'efecty' | 'breb'

export interface MoneyProductLimits {
  min: number
  max: number
}

/** Finds the synthetic product and its limits (with a fallback). */
export function useMoneyProduct(
  slug: MoneyProductSlug,
  fallback: MoneyProductLimits
) {
  const query = useMoneyProductsQuery()
  const product = query.data?.find((p) => p.slug === slug)
  const limits: MoneyProductLimits = {
    min: product?.minAmount ?? fallback.min,
    max: product?.maxAmount ?? fallback.max
  }
  const enabled = product ? product.metadata?.enabled !== false : false
  return { product, limits, enabled, isLoading: query.isLoading }
}
