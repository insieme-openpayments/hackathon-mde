import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Actions,
  BackButton,
  ByPuntored,
  DialogCard,
  Logo,
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
        <Logo />
        <DialogCard
          icon="/assets/facturas/trash-lg.svg"
          text="Factura eliminada"
        />
        <Actions>
          <BackButton onClick={() => setDelDone(false)} />
        </Actions>
        <ByPuntored />
      </Screen>
    )
  }

  if (delId && items.some((i) => i.id === delId)) {
    return (
      <Screen>
        <Logo />
        <DialogCard
          icon="/assets/facturas/trash-lg.svg"
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
        <ByPuntored />
      </Screen>
    )
  }

  if (items.length === 0) {
    return (
      <Screen>
        <Logo />
        <TitleBox>Facturas guardadas</TitleBox>
        <div className="flex w-full flex-col items-center gap-2 rounded-lg bg-white p-6 text-center shadow-soft">
          <img
            src="/assets/icons/cat-pago-servicios.svg"
            alt=""
            width={33}
            height={32}
          />
          <p className="text-sm font-bold text-neutral-darker">
            Aún no tienes facturas guardadas
          </p>
          <p className="text-xs text-text01">
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
        <ByPuntored />
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
      <Logo />
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
                'flex-1 pb-2 text-sm',
                tab === t ? 'font-bold text-blue-normal' : 'text-text01'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-0.5 w-full bg-blue-light-active">
          <span
            className={cn(
              'block h-full w-1/2 bg-blue-normal transition-transform',
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
          <p className="text-center text-sm text-text01">
            {tab === 'on'
              ? 'No tienes facturas disponibles para pago.'
              : 'No tienes facturas en esta sección.'}
          </p>
        )}
      </div>
      <Actions>
        <BackButton onClick={() => navigate('/')} />
        <ActionButton
          tone="secondary"
          grow
          onClick={() => navigate('/facturas/nueva')}
        >
          Guardar otra factura
        </ActionButton>
      </Actions>
      <ByPuntored />
    </Screen>
  )
}
