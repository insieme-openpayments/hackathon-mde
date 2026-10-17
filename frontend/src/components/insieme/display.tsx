// Read-only display blocks: KvRows, ProcessedBy, BankBlock, Receipt, Pasarela, StatusTracker.
import { useState } from 'react'
import { cn } from '@/lib/utils.ts'
import { OrderStatus } from '@/lib/api-types.ts'
import { formatDateTime } from '@/lib/money.ts'
import type {
  BankBlockProps,
  KvRowsProps,
  PasarelaProps,
  ProcessedByProps,
  ReceiptProps,
  StatusTrackerProps
} from './types.ts'

/** Label / value rows (`ui.rows`). */
export function KvRows({ rows, className }: KvRowsProps) {
  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      {rows.map((row, i) => (
        <div
          key={`${row.label}-${i}`}
          className={cn(
            'flex items-center gap-2 text-xs leading-[1.1] text-neutral-darker',
            row.className
          )}
        >
          <span className="w-36 shrink-0">{row.label}</span>
          <span
            className={cn(
              'min-w-0 flex-[1_0_0] break-words text-right font-semibold',
              row.tone === 'success' && 'text-success'
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const SUPPORT_LINE = (
  <>
    Si se requiere soporte o ampliar información contáctenos
    <br />a hola@oplat.co o al Whatsapp 3332822713
  </>
)

/** "Transacción procesada por:" + support line. */
export function ProcessedBy({ className }: ProcessedByProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div className="flex w-full items-center justify-center gap-1 text-[10px] leading-[1.1] text-neutral-darker">
        <strong>Transacción procesada por:</strong>
        <img
          src="/assets/img/puntored-logo-lg.svg"
          alt="Insieme"
          width={60}
          height={15}
          className="h-[15px] w-[60px]"
        />
      </div>
      <p className="w-full text-center text-[10px] leading-[1.1] text-neutral-darker">
        {SUPPORT_LINE}
      </p>
    </div>
  )
}

/** "Interledger Payments" brand text (replaces the Colpatria logo). */
function IlpBrand() {
  return (
    <span className="min-w-0 flex-[1_0_0] text-[10px] font-bold leading-[1.15] text-[#1f6f6b]">
      Interledger Payments
    </span>
  )
}

/**
 * "Banco procesador" block (Figma 190:13112 / 190:13133). Collapsed shows who
 * processed the payment; open shows the grey "Entidad financiera" card.
 */
export function BankBlock({
  variant = 'servicios',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  center,
  className
}: BankBlockProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const open = controlledOpen ?? innerOpen
  const toggle = () => {
    setInnerOpen(!open)
    onOpenChange?.(!open)
  }
  const interactive = variant === 'servicios'

  if (open) {
    return (
      <div
        className={cn(
          'flex w-full shrink-0 flex-col gap-2.5 rounded-[5px] bg-[#e7e9eb] px-2.5 py-1.5',
          className
        )}
      >
        <div className="flex w-full items-center gap-2.5 border-b border-neutral-normal pb-2">
          <strong className="min-w-0 flex-[1_0_0] text-[8px] font-bold text-black">
            Entidad financiera responsable:
          </strong>
          <IlpBrand />
          <button
            type="button"
            onClick={toggle}
            aria-label="Ocultar entidad"
            className="relative h-2 w-2 shrink-0 bg-transparent p-0 after:absolute after:-inset-2 after:content-['']"
          >
            <img
              src="/assets/servicios/union-minus.svg"
              alt=""
              width={8}
              height={8}
              className="h-2 w-2"
            />
          </button>
        </div>
        <p className="w-full text-[8px] text-black">
          Línea de atención personalizada en Bogotá: 3487881 Resto del país: 01
          8000 960 505
        </p>
      </div>
    )
  }

  const unionIcon = (
    <img
      src="/assets/servicios/union.svg"
      alt=""
      width={8}
      height={8}
      className="h-2 w-2"
    />
  )

  return (
    <div className={cn('flex w-full shrink-0 flex-col gap-2', className)}>
      <div className="flex w-full items-start gap-1 border-b border-neutral-normal pb-2">
        <div className="flex min-w-0 flex-[1_0_0] flex-col justify-center gap-1">
          <strong className="text-[8px] font-bold text-black">
            Transacción procesada por:
          </strong>
          <img
            src="/assets/img/puntored-logo-lg.svg"
            alt="Insieme"
            width={60}
            height={15}
            className="h-[15px] w-[60px]"
          />
        </div>
        <span className="whitespace-nowrap pb-[5px] pt-[15px] text-[8px] text-black">
          Corresponsal de:
        </span>
        <div className="flex min-w-0 flex-[1_0_0] flex-col justify-center gap-1">
          <strong className="text-[8px] font-bold text-black">
            Entidad financiera responsable
          </strong>
          <div className="flex w-full items-start gap-2.5">
            <IlpBrand />
            {interactive ? (
              <button
                type="button"
                onClick={toggle}
                aria-label="Ver entidad"
                className="relative h-2 w-2 shrink-0 bg-transparent p-0 after:absolute after:-inset-2 after:content-['']"
              >
                {unionIcon}
              </button>
            ) : (
              <span className="h-2 w-2 shrink-0">{unionIcon}</span>
            )}
          </div>
        </div>
      </div>
      <p
        className={cn('w-full text-[8px] text-black', center && 'text-center')}
      >
        Si se requiere soporte o ampliar información contáctenos a hola@oplat.co
        o al 3332822713
      </p>
    </div>
  )
}

const TITLE_TONE = {
  success: 'text-neutral-darker',
  error: 'text-magenta',
  warning: 'text-neutral-darker'
} as const

/** Transaction receipt (Figma 2402:21731). */
export function Receipt({
  title,
  tone = 'success',
  subtitle,
  rows,
  children,
  className
}: ReceiptProps) {
  return (
    <div className={cn('flex w-full flex-col items-center gap-4', className)}>
      <p
        className={cn(
          'w-full text-center text-base font-semibold leading-normal',
          TITLE_TONE[tone]
        )}
      >
        {title}
      </p>
      {subtitle ? (
        <div className="w-full text-center text-xs leading-[1.2] text-neutral-darker">
          {subtitle}
        </div>
      ) : null}
      <div className="w-full border-b border-neutral-normal py-5">
        <KvRows rows={rows} />
      </div>
      {children}
    </div>
  )
}

/** Small spinner (`.loader`). */
function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Procesando"
      className={cn(
        'h-[22px] w-[22px] animate-spin rounded-full border-2 border-blue-light-hover border-t-blue-normal',
        className
      )}
    />
  )
}

/** "Confirma el estado de tu transacción en el historial". */
export function Pasarela({ icon, message, className }: PasarelaProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-[1_0_0] flex-col items-center justify-center gap-4',
        className
      )}
    >
      {icon ? (
        <img
          src={icon}
          alt=""
          width={33}
          height={37}
          className="max-h-[37px]"
        />
      ) : null}
      <p className="text-center text-base leading-4 text-neutral-darker">
        {message ?? (
          <>
            Confirma el estado
            <br />
            de tu transacción en el historial
          </>
        )}
      </p>
      <Spinner />
    </div>
  )
}

export const TRACKER_STEPS = [
  'Autoriza el pago en tu billetera',
  'Moviendo el dinero (Open Payments)',
  'Fondos recibidos',
  'Factura pagada en Colombia'
] as const

type StepState = 'done' | 'active' | 'pending' | 'error'

/** Per-step state derived from the order status. */
function stepStates(status: OrderStatus): StepState[] {
  const states: StepState[] = ['pending', 'pending', 'pending', 'pending']
  const fill = (done: number, rest?: StepState) => {
    for (let i = 0; i < 4; i++) {
      if (i < done) states[i] = 'done'
      else if (i === done && rest) states[i] = rest
    }
  }
  switch (status) {
    case OrderStatus.PROCESSING:
      fill(1, 'active')
      break
    case OrderStatus.COMPLETED:
      fill(3, 'active')
      break
    case OrderStatus.SETTLED:
      fill(4)
      break
    case OrderStatus.SETTLEMENT_FAILED:
      fill(3, 'error')
      break
    case OrderStatus.FAILED:
      fill(1, 'error')
      break
    case OrderStatus.REJECTED:
      fill(0, 'error')
      break
  }
  return states
}

/** The 4-step progress of a payment, derived from `status`. */
export function StatusTracker({
  status,
  events,
  className
}: StatusTrackerProps) {
  const states = stepStates(status)
  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      <ol className="flex flex-col">
        {TRACKER_STEPS.map((step, i) => {
          const state = states[i]
          return (
            <li
              key={step}
              aria-current={state === 'active' ? 'step' : undefined}
              className="relative flex items-start gap-3 pb-4 last:pb-0"
            >
              {i < TRACKER_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-0.5',
                    state === 'done' ? 'bg-success' : 'bg-neutral-light-active'
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border text-xs font-medium',
                  state === 'done' && 'border-success bg-success text-white',
                  state === 'active' &&
                    'border-blue-normal bg-white text-blue-normal',
                  state === 'pending' &&
                    'border-neutral-light-active bg-white text-neutral-normal',
                  state === 'error' && 'border-magenta bg-magenta text-white'
                )}
              >
                {state === 'done' ? (
                  '✓'
                ) : state === 'error' ? (
                  '!'
                ) : state === 'active' ? (
                  <Spinner className="h-3.5 w-3.5 border-[1.5px]" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'pt-[3px] text-sm leading-normal',
                  state === 'done' && 'text-neutral-darker',
                  state === 'active' && 'font-semibold text-blue-darker',
                  state === 'pending' && 'text-neutral-normal',
                  state === 'error' && 'font-semibold text-magenta'
                )}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
      {events.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-neutral-light-active pt-3 text-[10px] leading-[1.2] text-neutral-normal">
          {events.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex gap-2">
              <span className="shrink-0 tabular-nums">
                {formatDateTime(event.at)}
              </span>
              <span className="min-w-0">{event.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
