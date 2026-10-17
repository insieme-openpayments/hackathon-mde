import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ByPuntored, Screen, Tip } from '@/components/insieme'
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
    id: 'recargas',
    label: 'Recargas',
    icon: 'cat-recargas',
    tip: 'Recarga minutos y datos<br>a cualquier operador',
    to: null
  },
  {
    id: 'paquetes',
    label: 'Paquetes',
    icon: 'cat-paquetes',
    tip: 'Compra paquetes de datos,<br>minutos y apps',
    to: null
  },
  {
    id: 'servicios',
    label: 'Pago de servicios',
    icon: 'cat-pago-servicios',
    tip: 'Paga tus facturas de<br>servicios públicos y más',
    to: '/servicios'
  },
  {
    id: 'pines',
    label: 'Pines y entretenimiento',
    icon: 'cat-pines',
    tip: 'Compra pines de streaming,<br>juegos y licencias',
    to: null
  }
]

export function Component() {
  const navigate = useNavigate()

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
    <Screen className="relative gap-6">
      <div className="flex items-center">
        <div className="relative h-[119px] w-[101px] flex-shrink-0 overflow-hidden">
          <img
            src="/assets/img/human-head.svg"
            alt=""
            aria-hidden="true"
            className="absolute left-[6.82%] top-[0.01%] h-[38.31%] w-[44.86%] max-w-none"
          />
          <img
            src="/assets/img/human-bottom.svg"
            alt=""
            aria-hidden="true"
            className="absolute left-[8.52%] top-[50.5%] h-[49.5%] w-[91.48%] max-w-none"
          />
          <img
            src="/assets/img/human-body.svg"
            alt=""
            aria-hidden="true"
            className="absolute left-[0.01%] top-[20.98%] h-[47.5%] w-[85.11%] max-w-none"
          />
        </div>
        <h2 className="flex-1 p-2.5 text-xl font-bold leading-[1.16] text-neutral-darker">
          Productos disponibles
        </h2>
      </div>

      <div className="grid w-full grid-cols-3 gap-x-3 gap-y-2">
        {PRODUCTS.map((p) => {
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
                'relative flex h-[88px] flex-col items-center justify-center gap-0.5 rounded-lg border border-blue-light-active bg-white px-1 py-2 transition-[border-color,box-shadow]',
                active
                  ? 'cursor-pointer hover:border-blue-normal hover:shadow-medium focus-visible:border-blue-normal focus-visible:shadow-medium focus-visible:outline-none'
                  : 'cursor-not-allowed opacity-50'
              )}
            >
              <span className="flex h-[38px] w-full items-center justify-center">
                <img
                  src={`/assets/icons/${p.icon}.svg`}
                  alt=""
                  width={33}
                  height={37}
                  className="h-[36.84px] w-[33.156px]"
                />
              </span>
              <span className="line-clamp-2 w-full flex-1 content-center text-center text-xs leading-[1.1] text-blue-darker [overflow-wrap:anywhere]">
                {p.label}
              </span>
              <span
                className="absolute right-1.5 top-[7px]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Tip icon="alert">
                  <span dangerouslySetInnerHTML={{ __html: p.tip }} />
                </Tip>
              </span>
              {active ? null : (
                <span className="absolute bottom-1 rounded-pill bg-blue-normal px-1.5 py-px text-3xs font-medium text-white">
                  Pronto
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-center">
        <ByPuntored />
      </div>
    </Screen>
  )
}
