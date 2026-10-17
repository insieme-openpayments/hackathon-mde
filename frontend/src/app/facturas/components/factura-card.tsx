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

const ICON_BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors hover:bg-brand-soft-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

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
        'flex w-full flex-col gap-3 rounded-2xl border border-brand-soft-active bg-white p-4 shadow-soft',
        !available && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
          {categoryIconName ? (
            <img
              src={categoryIcon(categoryIconName)}
              alt=""
              width={20}
              height={20}
              className="h-5 w-auto"
            />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-base font-bold leading-tight text-neutral-darker [overflow-wrap:anywhere]">
            {factura.name}
          </h2>
          <p className="text-2xs text-neutral-normal [overflow-wrap:anywhere]">
            {categoryLabel} · {convName}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label="Editar factura"
            onClick={() => onEdit(factura.id)}
            className={ICON_BUTTON}
          >
            <img
              src="/assets/facturas/pencil.svg"
              alt=""
              width={14}
              height={14}
            />
          </button>
          <button
            type="button"
            aria-label="Eliminar factura"
            onClick={() => onDelete(factura.id)}
            className={ICON_BUTTON}
          >
            <img
              src="/assets/facturas/trash.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-sheet p-3 text-2xs">
        <dt className="text-neutral-normal">Referencia de pago</dt>
        <dd className="text-right font-semibold text-neutral-darker [overflow-wrap:anywhere]">
          {factura.ref1}
        </dd>
        <dt className="text-neutral-normal">Último pago</dt>
        <dd className="text-right font-semibold text-neutral-darker">
          {factura.lastPay || 'Sin pagos aún'}
        </dd>
      </dl>
      {available ? (
        <ActionButton
          tone="active"
          className="w-full"
          onClick={() => onPay(factura.id)}
        >
          Pagar esta factura
        </ActionButton>
      ) : (
        <p className="text-center text-2xs text-neutral-normal">
          Este convenio ya no está disponible para pago.
        </p>
      )}
    </article>
  )
}
