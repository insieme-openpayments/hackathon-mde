import type { FacturaItem } from '@/lib/stores/facturas-store.ts'
import { categoryIcon } from '@/lib/assets.ts'
import { cn } from '@/lib/utils.ts'
import { ActionButton } from './buttons.tsx'

interface FacturaCardProps {
  factura: FacturaItem
  categoryLabel: string
  categoryIconName: string | null
  convName: string
  available: boolean
  onPay: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function FacturaCard({
  factura,
  categoryLabel,
  categoryIconName,
  convName,
  available,
  onPay,
  onEdit,
  onDelete
}: FacturaCardProps) {
  return (
    <article
      className={cn(
        'flex w-full gap-2 rounded-lg bg-white p-3 shadow-soft',
        !available && 'opacity-70'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-pill bg-blue-normal">
            {categoryIconName ? (
              <img
                src={categoryIcon(categoryIconName)}
                alt=""
                width={16}
                height={16}
                className="brightness-0 invert"
              />
            ) : null}
          </span>
          <span className="truncate text-sm font-medium text-neutral-darker">
            {factura.name}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-xs text-text01">
          <p>{categoryLabel}</p>
          <p>{convName}</p>
          <p>Referencia de pago: {factura.ref1}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text01">
            <strong>Último pago:</strong> {factura.lastPay || '—'}
          </p>
          {available ? (
            <ActionButton
              tone="active"
              className="h-8 px-4 text-xs"
              onClick={() => onPay(factura.id)}
            >
              Ir a pagar
            </ActionButton>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-label="Eliminar factura"
          onClick={() => onDelete(factura.id)}
          className="flex h-8 w-8 items-center justify-center rounded-pill bg-panel"
        >
          <img src="/assets/facturas/trash.svg" alt="" width={16} height={16} />
        </button>
        <button
          type="button"
          aria-label="Editar factura"
          onClick={() => onEdit(factura.id)}
          className="flex h-8 w-8 items-center justify-center rounded-pill bg-panel"
        >
          <img
            src="/assets/facturas/pencil.svg"
            alt=""
            width={11}
            height={11}
          />
        </button>
      </div>
    </article>
  )
}
