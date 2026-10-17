import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Actions,
  BackButton,
  BrandFooter,
  FloatingInput,
  Screen,
  TitleBox
} from '@/components/insieme'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import {
  useFacturaActions,
  useFacturasStore
} from '@/hooks/use-facturas-store.ts'
import { useZodRouteParams } from '@/hooks/use-zod-params.ts'
import { facturaParamsSchema } from '@/app/route-schemas.ts'
import { ActionButton } from './components/buttons.tsx'
import { CategorySelector } from './components/category-selector.tsx'

export function Component() {
  const { id } = useZodRouteParams(facturaParamsSchema)
  const navigate = useNavigate()
  const { items, isLoading } = useFacturasStore()
  const { updateFactura, updating } = useFacturaActions()
  const [apiError, setApiError] = useState<string | null>(null)
  const { data } = useCatalogQuery()
  const factura = items.find((i) => i.id === id)
  const [name, setName] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Screen>
        <div className="h-28 w-full animate-pulse rounded-2xl bg-brand-soft" />
      </Screen>
    )
  }

  if (!factura) {
    return (
      <Screen>
        <p className="text-base text-neutral-darker">
          La factura ya no existe.
        </p>
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
  const ok = valid && !updating && current.trim() !== factura.name

  return (
    <Screen>
      <TitleBox>Editar factura</TitleBox>
      <p className="text-sm leading-snug text-neutral-darker">
        Solo puedes cambiar el nombre de la factura.
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
              : apiError
                ? apiError
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
            setApiError(null)
            updateFactura({ id: factura.id, name: current.trim() })
              .then(() => navigate(-1))
              .catch((e: unknown) => {
                const err = e as {
                  message?: string
                  errors?: Record<string, string>
                }
                setApiError(
                  err.errors?.name ?? err.message ?? 'No pudimos guardar'
                )
              })
          }}
        >
          Guardar
        </ActionButton>
      </Actions>
      <BrandFooter />
    </Screen>
  )
}
