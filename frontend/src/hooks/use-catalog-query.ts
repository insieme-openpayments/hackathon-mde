// Owner: P2 (data-stores).
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetcher, APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import type { CatalogProduct, CatalogResponse } from '@/lib/api-types.ts'

export function useCatalogQuery(
  type: 'servicio' = 'servicio'
): UseQueryResult<SuccessResponse<CatalogResponse>, APIError> {
  return useQuery({
    queryKey: ['catalog', type],
    queryFn: async () =>
      await fetcher<CatalogResponse>('/catalog?type=' + type, {
        method: 'GET'
      }),
    staleTime: 5 * 60 * 1000
  })
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Accent/case-insensitive product search by name. */
export function searchProducts(
  products: CatalogProduct[],
  query: string
): CatalogProduct[] {
  const q = normalize(query)
  if (!q) return products
  return products.filter((p) => normalize(p.name).includes(q))
}
