import { publicUrl } from '@/lib/assets.ts'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BrandFooter,
  CategoryCard,
  CategoryGrid,
  CompanyList,
  Screen,
  SearchInput,
  SortSelect,
  type SortOrder
} from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { searchProducts, useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useZodRouteParams } from '@/hooks/use-zod-params.ts'
import { categoryParamsSchema } from '@/app/route-schemas.ts'

export function Component() {
  const { categoryId } = useZodRouteParams(categoryParamsSchema)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useCatalogQuery()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOrder>('asc')

  const categories = data?.result.categories
  const category = categories?.find((c) => c.id === categoryId)

  const list = useMemo(() => {
    const inCategory = (data?.result.products ?? []).filter(
      (p) => p.category === categoryId
    )
    const dir = sort === 'asc' ? 1 : -1
    return searchProducts(inCategory, query).sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }) * dir
    )
  }, [data, categoryId, query, sort])

  const pick = (id: string) => {
    setQuery('')
    navigate(`/servicios/categoria/${id}`)
  }

  return (
    <Screen>
      {category ? (
        <CategoryCard category={category} variant="plain" />
      ) : isLoading ? (
        <Shimmer className="h-14 rounded-xl" />
      ) : null}

      <div className="flex w-full items-center justify-between gap-3">
        <p className="min-w-0 text-sm leading-snug text-neutral-darker">
          Elige la empresa a la que vas a pagar
        </p>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      <div className="flex w-full flex-col gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Filtra por nombre"
        />
        <div className="max-h-[320px] overflow-y-auto rounded-xl">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Shimmer key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <CompanyList
              products={list}
              onSelect={(p) => navigate(`/servicios/pagar/${p.id}`)}
              empty={
                <p className="p-4 text-sm text-neutral-normal">
                  No encontramos empresas o convenios con ese nombre
                </p>
              }
            />
          )}
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-magenta">
          No pudimos cargar las empresas, intenta de nuevo
        </p>
      ) : (
        <details className="group w-full">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-neutral-light-active bg-white px-4 py-3 text-sm font-medium text-brand [&::-webkit-details-marker]:hidden">
            Cambiar de categoría
            <img
              src={publicUrl('assets/icons/chevron-down.svg')}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <CategoryGrid
            className="mt-2"
            categories={categories ?? []}
            selectedId={categoryId}
            onSelect={pick}
          />
        </details>
      )}

      <div className="mt-2 flex w-full flex-col items-center gap-4">
        <Button
          aria-label="Volver"
          variant="outline"
          className="w-full"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <BrandFooter />
      </div>
    </Screen>
  )
}
