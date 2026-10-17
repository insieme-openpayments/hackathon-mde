import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BrandFooter,
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
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold leading-tight text-neutral-darker">
          Pago de servicios
        </h1>
        <p className="text-sm leading-snug text-neutral-normal">
          Ponte al día con tus pagos pendientes de manera rápida y segura.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-2xl bg-brand-soft p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-neutral-darker">
            Facturas guardadas
          </p>
          <p className="text-2xs leading-snug text-neutral-normal">
            Guarda tus facturas frecuentes y págalas en segundos.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          <Button
            aria-label="Ver mis facturas guardadas"
            variant="outline"
            size="sm"
            className="min-w-0 flex-1"
            onClick={() => navigate('/facturas')}
          >
            Ver mis facturas
          </Button>
          <Button
            aria-label="Guardar una factura"
            variant="dark"
            size="sm"
            className="min-w-0 flex-1"
            onClick={() => navigate('/facturas/nueva')}
          >
            + Guardar factura
          </Button>
        </div>
      </div>

      <p className="w-full text-sm leading-snug text-neutral-darker">
        Busca la empresa o elige la categoría del pago.
      </p>

      <div className="relative z-[5] w-full">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Busca por empresa o convenio"
        />
        {results ? (
          <div className="absolute inset-x-0 top-full z-10 mt-2 max-h-[280px] overflow-y-auto rounded-xl shadow-medium">
            <CompanyList
              products={results}
              onSelect={(p) => navigate(`/servicios/pagar/${p.id}`)}
              empty={
                <p className="p-4 text-sm text-neutral-normal">
                  No encontramos empresas o convenios con ese nombre
                </p>
              }
            />
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 12 }, (_, i) => (
            <Shimmer key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-magenta">
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
          aria-label="Volver al inicio"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/')}
        >
          Volver
        </Button>
        <BrandFooter />
      </div>
    </Screen>
  )
}
