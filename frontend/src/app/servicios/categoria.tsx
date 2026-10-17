import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ByPuntored,
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
        <CategoryCard
          category={category}
          onSelect={() => undefined}
          className="pointer-events-none"
        />
      ) : isLoading ? (
        <Shimmer className="h-12" />
      ) : null}

      <div className="flex w-full flex-col gap-3">
        <p className="w-full text-center text-2xs text-neutral-darker">
          Selecciona o filtra la opción de empresa por el pago
        </p>
        <div className="flex w-full items-start justify-center gap-4">
          <span className="whitespace-nowrap pt-1 text-2xs text-[#444a4f]">
            Ordenar por:
          </span>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="w-full">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Busca por empresa o convenio"
        />
        <div className="mt-1 max-h-[260px] overflow-y-auto rounded-lg bg-white shadow-medium">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Shimmer key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <CompanyList
              products={list}
              onSelect={(p) => navigate(`/servicios/pagar/${p.id}`)}
              empty={
                <p className="p-3 text-xs text-neutral-darker">
                  No encontramos empresas o convenios con ese nombre
                </p>
              }
            />
          )}
        </div>
      </div>

      {isError ? (
        <p className="text-xs text-magenta">
          No pudimos cargar las empresas, intenta de nuevo
        </p>
      ) : (
        <CategoryGrid categories={categories ?? []} onSelect={pick} />
      )}

      <div className="mt-2 flex w-full flex-col items-center gap-4">
        <Button
          aria-label="Volver"
          variant="dark"
          className="w-full"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <ByPuntored />
      </div>
    </Screen>
  )
}
