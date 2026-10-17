import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Actions,
  BackButton,
  BrandFooter,
  CategoryGrid,
  FloatingInput,
  Screen,
  TitleBox
} from '@/components/insieme'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { digits } from '@/lib/money.ts'
import type { CatalogProduct } from '@/lib/api-types.ts'
import { addFactura } from '@/lib/stores/facturas-store.ts'
import { ActionButton } from './components/buttons.tsx'
import { CategorySelector } from './components/category-selector.tsx'
import { ConvDropdown } from './components/conv-dropdown.tsx'

export function Component() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isLoading } = useCatalogQuery()
  const categories = data?.result.categories ?? []
  const products = data?.result.products ?? []

  const [catId, setCatId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [ref1, setRef1] = useState('')
  const [ref2, setRef2] = useState('')
  const [tried, setTried] = useState(false)

  const view = searchParams.get('view')
  const category = categories.find((c) => c.id === catId) ?? null

  if (view === 'categorias') {
    return (
      <Screen>
        <TitleBox>Elige la categoría</TitleBox>
        <CategoryGrid
          categories={categories}
          onSelect={(id) => {
            if (id !== catId) setProduct(null)
            setCatId(id)
            setSearchParams({}, { replace: true })
          }}
        />
        <Actions>
          <BackButton onClick={() => setSearchParams({}, { replace: true })} />
        </Actions>
        <BrandFooter />
      </Screen>
    )
  }

  const valid = {
    cat: !!catId,
    name: name.trim().length >= 3,
    conv: !!product,
    ref1: /^\d{6,}$/.test(ref1)
  }
  const ok = Object.values(valid).every(Boolean)
  const nameErr =
    name && !valid.name
      ? 'El nombre debe tener al menos 3 caracteres'
      : tried && !valid.name
        ? 'Digita un nombre de mínimo 3 caracteres'
        : undefined
  const refErr =
    ref1 && !valid.ref1
      ? 'La referencia debe tener mínimo 6 dígitos'
      : tried && !valid.ref1
        ? 'Digita una referencia numérica de mínimo 6 dígitos'
        : undefined

  const openCategories = () =>
    setSearchParams({ view: 'categorias' }, { replace: false })

  const save = () => {
    if (!ok || !product || !catId) {
      setTried(true)
      return
    }
    addFactura({
      name: name.trim(),
      cat: catId,
      conv: product.slug,
      productId: product.id,
      ref1,
      ref2,
      lastPay: null,
      amount: null
    })
    navigate('/facturas/guardada', { replace: true })
  }

  return (
    <Screen>
      <TitleBox>Guardar facturas</TitleBox>
      <p className="text-sm leading-snug text-neutral-darker">
        Elige la categoría y la empresa, y dale un nombre fácil de recordar.
      </p>
      <CategorySelector
        category={category}
        onOpen={openCategories}
        error={tried && !valid.cat ? 'Selecciona una categoría' : undefined}
      />
      <div className="flex w-full flex-col gap-3">
        <FloatingInput
          label="Nombre de la factura"
          placeholder="Digita el sobrenombre para la factura"
          maxLength={30}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/^\s+/, ''))}
          error={nameErr}
        />
        <ConvDropdown
          key={catId ?? 'none'}
          products={products.filter((p) => p.category === catId)}
          hasCategory={!!catId}
          value={product}
          onChange={setProduct}
          onNeedCategory={openCategories}
          error={
            tried && !valid.conv
              ? 'Selecciona un convenio o proveedor'
              : undefined
          }
        />
        <FloatingInput
          label="Referencia No.1"
          placeholder="Digita el número de referencia 1"
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
          value={ref1}
          onChange={(e) => setRef1(digits(e.target.value))}
          error={refErr}
        />
        <FloatingInput
          label="Referencia No.2"
          placeholder="Digita el número de referencia 2"
          inputMode="numeric"
          maxLength={20}
          autoComplete="off"
          value={ref2}
          onChange={(e) => setRef2(digits(e.target.value))}
        />
      </div>
      <Actions>
        <BackButton onClick={() => navigate('/facturas')} />
        <ActionButton
          tone={ok && !isLoading ? 'active' : 'disabled'}
          grow
          onClick={save}
        >
          Continuar
        </ActionButton>
      </Actions>
      <BrandFooter />
    </Screen>
  )
}
