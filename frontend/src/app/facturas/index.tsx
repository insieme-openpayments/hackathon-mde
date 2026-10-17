import { publicUrl } from '@/lib/assets.ts'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Actions,
  BackButton,
  BrandFooter,
  DialogCard,
  Screen,
  TitleBox
} from '@/components/insieme'
import { useCatalogQuery } from '@/hooks/use-catalog-query.ts'
import { useFacturasStore } from '@/hooks/use-facturas-store.ts'
import { removeFactura } from '@/lib/stores/facturas-store.ts'
import { cn } from '@/lib/utils.ts'
import { ActionButton } from './components/buttons.tsx'
import { FacturaCard } from './components/factura-card.tsx'

type Tab = 'on' | 'off'

export function Component() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { items } = useFacturasStore()
  const { data, isLoading } = useCatalogQuery()
  const [delId, setDelId] = useState<string | null>(null)
  const [delDone, setDelDone] = useState(false)

  const tab: Tab = searchParams.get('tab') === 'off' ? 'off' : 'on'
  const categories = data?.result.categories ?? []
  const products = data?.result.products ?? []

  if (delDone) {
    return (
      <Screen>
        <DialogCard
          icon={publicUrl('assets/facturas/trash-lg.svg')}
          text="Factura eliminada"
        />
        <Actions>
          <BackButton onClick={() => setDelDone(false)} />
        </Actions>
        <BrandFooter />
      </Screen>
    )
  }

  if (delId && items.some((i) => i.id === delId)) {
    return (
      <Screen>
        <DialogCard
          icon={publicUrl('assets/facturas/trash-lg.svg')}
          text={
            <>
              ¿Estás seguro de que deseas
              <br />
              eliminar esta factura?
            </>
          }
        >
          <div className="flex w-full justify-center gap-3">
            <ActionButton
              tone="yes"
              onClick={() => {
                removeFactura(delId)
                setDelId(null)
                setDelDone(true)
              }}
            >
              Si
            </ActionButton>
            <ActionButton tone="no" onClick={() => setDelId(null)}>
              No
            </ActionButton>
          </div>
        </DialogCard>
        <BrandFooter />
      </Screen>
    )
  }

  if (items.length === 0) {
    return (
      <Screen>
        <TitleBox>Facturas guardadas</TitleBox>
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-brand-soft-active bg-white p-6 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
            <img
              src={publicUrl('assets/icons/cat-pago-servicios.svg')}
              alt=""
              width={30}
              height={29}
            />
          </span>
          <p className="text-base font-bold text-neutral-darker">
            Aún no tienes facturas guardadas
          </p>
          <p className="text-sm leading-snug text-neutral-normal">
            Guarda tus facturas de servicios para pagarlas más rápido la próxima
            vez.
          </p>
        </div>
        <Actions>
          <BackButton onClick={() => navigate('/')} />
          <ActionButton
            tone="active"
            grow
            onClick={() => navigate('/facturas/nueva')}
          >
            Guardar facturas
          </ActionButton>
        </Actions>
        <BrandFooter />
      </Screen>
    )
  }

  // `available` is derived from the catalog: the saved convenio still exists.
  const isAvailable = (productId: string) =>
    isLoading || !data || products.some((p) => p.id === productId)
  const list = items.filter((i) =>
    tab === 'on' ? isAvailable(i.productId) : !isAvailable(i.productId)
  )

  const setTab = (t: Tab) =>
    setSearchParams(t === 'on' ? {} : { tab: t }, { replace: true })

  return (
    <Screen>
      <TitleBox>Facturas guardadas</TitleBox>
      <div role="tablist" className="flex w-full flex-col">
        <div className="flex w-full">
          {(
            [
              ['on', 'Disponible para pago'],
              ['off', 'No disponible']
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'min-w-0 flex-1 px-1 pb-2 text-sm leading-snug transition-colors',
                tab === t
                  ? 'font-bold text-brand'
                  : 'font-medium text-neutral-normal'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-0.5 w-full rounded-full bg-neutral-light-active">
          <span
            className={cn(
              'block h-full w-1/2 rounded-full bg-brand transition-transform',
              tab === 'off' && 'translate-x-full'
            )}
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        {list.length ? (
          list.map((f) => {
            const cat = categories.find((c) => c.id === f.cat)
            const product = products.find((p) => p.id === f.productId)
            return (
              <FacturaCard
                key={f.id}
                factura={f}
                categoryLabel={cat?.label ?? f.cat}
                categoryIconName={cat?.icon ?? null}
                convName={product?.name ?? f.conv}
                available={isAvailable(f.productId)}
                onPay={(id) => navigate(`/facturas/${id}/pagar`)}
                onEdit={(id) => navigate(`/facturas/${id}/editar`)}
                onDelete={setDelId}
              />
            )
          })
        ) : (
          <p className="py-6 text-center text-sm text-neutral-normal">
            {tab === 'on'
              ? 'No tienes facturas disponibles para pago.'
              : 'No tienes facturas en esta sección.'}
          </p>
        )}
      </div>
      <Actions>
        <BackButton onClick={() => navigate('/')} />
        <ActionButton
          tone="blue"
          grow
          onClick={() => navigate('/facturas/nueva')}
        >
          Guardar otra factura
        </ActionButton>
      </Actions>
      <BrandFooter />
    </Screen>
  )
}
