import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ByPuntored,
  CategoryGrid,
  CompanyList,
  Screen,
  SearchInput
} from '@/components/insieme'
import { Button } from '@/components/ui/button.tsx'
import { Shimmer } from '@/components/ui/shimmer.tsx'
import { searchProducts, useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import type { CatalogProduct } from '@/lib/api-types.ts'

const byName = (a: CatalogProduct, b: CatalogProduct) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

export function Component() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useCatalogQuery()
  const [query, setQuery] = useState('')

  const categories = data?.result.categories ?? []
  const products = data?.result.products
  const results = useMemo(
    () =>
      query.trim() && products
        ? searchProducts(products, query).sort(byName)
        : null,
    [products, query]
  )

  return (
    <Screen>
      <div className="flex w-full flex-col gap-1 rounded-lg bg-sheet p-3">
        <p className="w-full text-xs font-semibold leading-[1.1] text-blue-darker">
          Ponte al día con tus pagos pendientes, de manera rápida y segura
        </p>
        <p className="w-full text-2xs text-blue-darker">
          Visualiza y guarda tus facturas para próximos pagos
        </p>
        <div className="mt-1 flex w-full items-start gap-1">
          <button
            type="button"
            onClick={() => navigate('/facturas')}
            className="flex flex-1 items-center gap-2 rounded border border-blue-normal bg-white p-2 text-left hover:shadow-soft"
          >
            <img
              src="/assets/servicios/facturas-doc.svg"
              alt=""
              width={16}
              height={20}
            />
            <span className="text-2xs text-blue-normal">
              Facturas guardadas
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/facturas/nueva')}
            className="rounded bg-blue-normal px-3 py-3 text-2xs font-medium text-white hover:bg-blue-hover"
          >
            + Facturas
          </button>
        </div>
      </div>

      <p className="w-full text-xs leading-[1.1] text-neutral-darker">
        Busca por empresa o selecciona la categoría del pago a realizar
      </p>

      <div className="relative z-[5] w-full">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Busca por empresa o convenio"
        />
        {results ? (
          <div
            role="listbox"
            className="absolute inset-x-0 top-full z-10 mt-1 max-h-[260px] overflow-y-auto rounded-lg bg-white shadow-medium"
          >
            <CompanyList
              products={results}
              onSelect={(p) => navigate(`/servicios/pagar/${p.id}`)}
              empty={
                <p className="p-3 text-xs text-neutral-darker">
                  No encontramos empresas o convenios con ese nombre
                </p>
              }
            />
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Shimmer key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-magenta">
          No pudimos cargar las categorías, intenta de nuevo
        </p>
      ) : (
        <CategoryGrid
          categories={categories}
          onSelect={(id) => navigate(`/servicios/categoria/${id}`)}
        />
      )}

      <div className="mt-2 flex w-full flex-col items-center gap-4">
        <Button
          aria-label="Volver"
          variant="dark"
          className="w-full"
          onClick={() => navigate('/')}
        >
          Volver
        </Button>
        <ByPuntored />
      </div>
    </Screen>
  )
}
