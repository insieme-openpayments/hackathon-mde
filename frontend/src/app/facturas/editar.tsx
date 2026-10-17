import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  ByPuntored,
  FloatingInput,
  Screen,
  TitleBox
} from '@/components/insieme'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useFacturasStore } from '@/hooks/use-facturas-store.ts'
import { useZodRouteParams } from '@/hooks/use-zod-params.ts'
import { facturaParamsSchema } from '@/app/route-schemas.ts'
import { updateFactura } from '@/lib/stores/facturas-store.ts'
import { ActionButton } from './components/buttons.tsx'
import { CategorySelector } from './components/category-selector.tsx'

export function Component() {
  const { id } = useZodRouteParams(facturaParamsSchema)
  const navigate = useNavigate()
  const { items } = useFacturasStore()
  const { data } = useCatalogQuery()
  const factura = items.find((i) => i.id === id)
  const [name, setName] = useState<string | null>(null)

  if (!factura) {
    return (
      <Screen>
        <p className="text-sm">La factura ya no existe.</p>
        <ActionButton tone="dark" onClick={() => navigate('/facturas')}>
          Volver
        </ActionButton>
      </Screen>
    )
  }

  const category =
    data?.result.categories.find((c) => c.id === factura.cat) ?? null
  const convName =
    data?.result.products.find((p) => p.id === factura.productId)?.name ??
    factura.conv
  const current = name ?? factura.name
  const valid = current.trim().length >= 3
  const ok = valid && current.trim() !== factura.name

  return (
    <Screen>
      <TitleBox>Guardar facturas</TitleBox>
      <p className="text-sm text-neutral-darker">
        Selecciona la categoría o servicio:
      </p>
      <CategorySelector
        category={
          category ?? {
            id: factura.cat,
            label: factura.cat,
            icon: null,
            sortOrder: 0
          }
        }
        locked
      />
      <div className="flex w-full flex-col gap-3">
        <FloatingInput
          label="Nombre de la factura"
          maxLength={30}
          autoComplete="off"
          value={current}
          onChange={(e) => setName(e.target.value.replace(/^\s+/, ''))}
          error={
            current && !valid
              ? 'El nombre debe tener al menos 3 caracteres'
              : undefined
          }
        />
        <FloatingInput
          label="Convenio o proveedor"
          value={convName}
          disabled
          dim
          readOnly
        />
        <FloatingInput
          label="Referencia No.1"
          value={factura.ref1}
          disabled
          dim
          readOnly
        />
      </div>
      <Actions>
        <BackButton onClick={() => navigate(-1)} />
        <ActionButton
          tone={ok ? 'active' : 'disabled'}
          grow
          aria-disabled={!ok}
          onClick={() => {
            if (!ok) return
            updateFactura(factura.id, { name: current.trim() })
            navigate(-1)
          }}
        >
          Guardar
        </ActionButton>
      </Actions>
      <ByPuntored />
    </Screen>
  )
}
