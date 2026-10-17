import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandFooter, Isotipo, Screen, Tip } from '@/components/insieme'
import { useMoneyProductsQuery } from '@/hooks/use-money-products-query.ts'
import { cn } from '@/lib/utils.ts'

interface HomeProduct {
  id: string
  label: string
  icon: string
  tip: string
  to: string | null
}

const PRODUCTS: HomeProduct[] = [
  {
    id: 'servicios',
    label: 'Pago de servicios',
    icon: 'cat-pago-servicios',
    tip: 'Paga facturas de servicios públicos, salud, educación y más',
    to: '/servicios'
  },
  {
    id: 'efecty',
    label: 'Giro Efecty',
    icon: 'cat-efecty',
    tip: 'Envía dinero a una persona en Colombia: reclama en efectivo en un punto Efecty',
    to: '/giros'
  },
  {
    id: 'breb',
    label: 'Bre-B',
    icon: 'cat-breb',
    tip: 'Transfiere a una llave Bre-B: celular, correo o documento',
    to: '/breb'
  },
  {
    id: 'recargas',
    label: 'Recargas',
    icon: 'cat-recargas',
    tip: 'Recarga minutos y datos a cualquier operador',
    to: null
  },
  {
    id: 'paquetes',
    label: 'Paquetes',
    icon: 'cat-paquetes',
    tip: 'Compra paquetes de datos, minutos y apps',
    to: null
  },
  {
    id: 'pines',
    label: 'Pines y entretenimiento',
    icon: 'cat-pines',
    tip: 'Compra pines de streaming, juegos y licencias',
    to: null
  }
]

export function Component() {
  const navigate = useNavigate()
  const money = useMoneyProductsQuery()
  // A failed query shows every card; only an explicit enabled=false hides one.
  const hidden = new Set(
    (money.data ?? [])
      .filter((p) => p.metadata?.enabled === false)
      .map((p) => p.slug)
  )
  const visible = PRODUCTS.filter((p) => !hidden.has(p.id))

  const open = (product: HomeProduct) => {
    if (product.to) navigate(product.to)
  }

  const onKeyDown = (e: KeyboardEvent, product: HomeProduct) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open(product)
    }
  }

  return (
    <Screen className="gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-medium">
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10"
        />
        <div className="relative flex items-start gap-4">
          <Isotipo size={56} className="ring-2 ring-white/30" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight">
              Paga los servicios de tu familia en Colombia
            </h1>
            <p className="mt-2 text-2xs leading-relaxed text-white/85">
              Desde cualquier lugar, con tu billetera Interledger. Sin registro:
              solo ingresa tu billetera al pagar.
            </p>
            <p className="mt-3 text-3xs font-medium text-accent">
              Insieme significa “juntos”: tú &amp; tu familia, siempre unidos.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-neutral-darker">
          ¿Qué quieres pagar hoy?
        </h2>
        <div className="grid w-full grid-cols-2 gap-3">
          {visible.map((p) => {
            const active = p.to !== null
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={active ? 0 : -1}
                aria-disabled={active ? undefined : true}
                onClick={() => open(p)}
                onKeyDown={(e) => onKeyDown(e, p)}
                className={cn(
                  'relative flex min-h-[124px] flex-col items-start justify-between gap-3 rounded-2xl border bg-white p-4 transition-[border-color,box-shadow]',
                  active
                    ? 'cursor-pointer border-brand shadow-soft hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
                    : 'cursor-not-allowed border-neutral-light-active'
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl',
                      active ? 'bg-accent' : 'bg-brand-soft opacity-60'
                    )}
                  >
                    <img
                      src={`/assets/icons/${p.icon}.svg`}
                      alt=""
                      width={26}
                      height={26}
                      className="h-[26px] w-auto"
                    />
                  </span>
                  <span
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Tip icon="alert">{p.tip}</Tip>
                  </span>
                </div>
                <div className="flex w-full flex-col gap-1">
                  <span
                    className={cn(
                      'text-sm font-semibold leading-tight [overflow-wrap:anywhere]',
                      active ? 'text-neutral-darker' : 'text-neutral-normal'
                    )}
                  >
                    {p.label}
                  </span>
                  <span
                    className={cn(
                      'text-3xs font-medium',
                      active ? 'text-brand' : 'text-neutral-normal'
                    )}
                  >
                    {active ? 'Disponible' : 'Próximamente'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BrandFooter />
    </Screen>
  )
}
