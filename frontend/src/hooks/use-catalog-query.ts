// Owner: P2 (data-stores).
import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetcher, APIError } from '@/lib/fetcher.ts'
import type { SuccessResponse } from '@/lib/types.ts'
import type {
  Category,
  CatalogProduct,
  CatalogResponse
} from '@/lib/api-types.ts'

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

/** Accent/case-insensitive product search by name, sorted A-Z (es). */
export function searchProducts(
  products: CatalogProduct[],
  query: string
): CatalogProduct[] {
  const q = normalize(query)
  const matches = q
    ? products.filter((p) => normalize(p.name).includes(q))
    : [...products]
  return matches.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/** Products of one category, sorted A-Z (or Z-A) with Spanish collation. */
export function productsByCategory(
  products: CatalogProduct[],
  categoryId: string,
  order: 'asc' | 'desc' = 'asc'
): CatalogProduct[] {
  const list = products
    .filter((p) => p.category === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return order === 'desc' ? list.reverse() : list
}

export function useCategory(
  categoryId: string | undefined
): Category | undefined {
  const { data } = useCatalogQuery()
  return useMemo(
    () => data?.result.categories.find((c) => c.id === categoryId),
    [data, categoryId]
  )
}

/** Finds a product by id or slug. */
export function useProduct(
  idOrSlug: string | undefined
): CatalogProduct | undefined {
  const { data } = useCatalogQuery()
  return useMemo(
    () =>
      data?.result.products.find(
        (p) => p.id === idOrSlug || p.slug === idOrSlug
      ),
    [data, idOrSlug]
  )
}
