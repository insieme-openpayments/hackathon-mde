import { useState } from 'react'
import { FloatingInput } from '@/components/insieme'
import type { CatalogProduct } from '@/lib/api-types.ts'
import { searchProducts } from '@/hooks/use-catalog-query.ts'

interface ConvDropdownProps {
  /** Catalog products of the selected category (empty when none selected). */
  products: CatalogProduct[]
  hasCategory: boolean
  value: CatalogProduct | null
  error?: string
  onChange: (product: CatalogProduct | null) => void
  onNeedCategory: () => void
}

export function ConvDropdown({
  products,
  hasCategory,
  value,
  error,
  onChange,
  onNeedCategory
}: ConvDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const items = searchProducts(products, query)

  return (
    <div className="relative flex w-full flex-col gap-1">
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setQuery('')
            setOpen(false)
          }}
          className="flex items-center gap-1 self-end text-2xs font-medium text-brand"
        >
          <span>Borrar selección</span>
          <img
            src="/assets/facturas/eraser.svg"
            alt=""
            width={13}
            height={13}
          />
        </button>
      ) : null}
      <FloatingInput
        label="Convenio o proveedor"
        placeholder="Selecciona el proveedor de tu servicio"
        autoComplete="off"
        error={error}
        value={value ? value.name : query}
        onChange={(e) => {
          onChange(null)
          setQuery(e.target.value)
          setOpen(true)
        }}
        trailing={
          <button
            type="button"
            aria-label="Buscar convenio"
            onClick={() => setOpen((o) => !o)}
          >
            <img
              src="/assets/facturas/search.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        }
      />
      {open ? (
        <div
          role="listbox"
          className="no-scrollbar absolute inset-x-0 top-full z-20 mt-1 flex max-h-56 flex-col overflow-y-auto rounded-xl border border-neutral-light-active bg-white shadow-medium"
        >
          {!hasCategory ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onNeedCategory()
              }}
              className="p-3 text-left text-sm font-medium text-brand"
            >
              Primero selecciona la categoría o servicio ›
            </button>
          ) : items.length ? (
            items.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={value?.id === p.id}
                onClick={() => {
                  onChange(p)
                  setQuery('')
                  setOpen(false)
                }}
                className="border-b border-neutral-light-active p-3 text-left text-sm text-neutral-darker last:border-b-0 hover:bg-brand-soft"
              >
                {p.name}
              </button>
            ))
          ) : (
            <p className="p-3 text-sm text-neutral-normal">
              No encontramos convenios con ese nombre
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
