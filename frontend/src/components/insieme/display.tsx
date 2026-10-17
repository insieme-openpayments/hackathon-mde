// Read-only display blocks. STUB - P1 (design-system) restyles; P5 owns
// the final StatusTracker behaviour (steps derived from status/events).
import { cn } from '@/lib/utils.ts'
import { OrderStatus } from '@/lib/api-types.ts'
import type {
  BankBlockProps,
  KvRowsProps,
  PasarelaProps,
  ProcessedByProps,
  ReceiptProps,
  StatusTrackerProps
} from './types.ts'

export function KvRows({ rows, className }: KvRowsProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn('flex justify-between gap-4 text-xs', row.className)}
        >
          <span className="text-neutral-normal">{row.label}</span>
          <span className="text-right font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ProcessedBy({ className }: ProcessedByProps) {
  return (
    <div className={cn('flex flex-col gap-1 text-2xs', className)}>
      <p>
        <strong>Transacción procesada por:</strong> Insieme
      </p>
      <p>
        Si se requiere soporte o ampliar información contáctenos a hola@oplat.co
        o al Whatsapp 3332822713
      </p>
    </div>
  )
}

export function BankBlock({ className }: BankBlockProps) {
  return (
    <div className={cn('flex flex-col gap-1 text-2xs', className)}>
      <span>Entidad financiera responsable</span>
      <span className="font-bold text-[#1f6f6b]">Interledger Payments</span>
    </div>
  )
}

export function Receipt({
  title,
  tone = 'success',
  subtitle,
  rows,
  children,
  className
}: ReceiptProps) {
  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      <h2
        className={cn(
          'text-center text-lg font-bold',
          tone === 'success' && 'text-success',
          tone === 'error' && 'text-magenta'
        )}
      >
        {title}
      </h2>
      {subtitle}
      <KvRows rows={rows} />
      {children}
    </div>
  )
}

export function Pasarela({ icon, message, className }: PasarelaProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-4 text-center', className)}
    >
      {icon ? <img src={icon} alt="" width={33} height={37} /> : null}
      <p className="text-sm">
        {message ?? 'Confirma el estado de tu transacción en el historial'}
      </p>
    </div>
  )
}

export const TRACKER_STEPS = [
  'Autoriza el pago en tu billetera',
  'Moviendo el dinero (Open Payments)',
  'Fondos recibidos',
  'Factura pagada en Colombia'
] as const

/** Index of the step in progress, 0-based; 4 = all done. */
function currentStep(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PROCESSING:
      return 1
    case OrderStatus.COMPLETED:
      return 3
    case OrderStatus.SETTLED:
      return 4
    default:
      return 0
  }
}

export function StatusTracker({
  status,
  events,
  className
}: StatusTrackerProps) {
  const current = currentStep(status)
  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <ol className="flex flex-col gap-2">
        {TRACKER_STEPS.map((step, i) => (
          <li
            key={step}
            className={cn(
              'text-sm',
              i < current && 'text-success',
              i === current && 'font-semibold',
              i > current && 'text-neutral-normal'
            )}
          >
            {step}
          </li>
        ))}
      </ol>
      <ul className="flex flex-col gap-1 text-2xs text-neutral-normal">
        {events.map((event) => (
          <li key={event.at + event.message}>{event.message}</li>
        ))}
      </ul>
    </div>
  )
}
