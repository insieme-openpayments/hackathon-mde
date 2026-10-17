// Read-only display blocks: KvRows, SupportNote, Receipt, Pasarela, StatusTracker.
import { cn } from '@/lib/utils.ts'
import { OrderStatus } from '@/lib/api-types.ts'
import { formatDateTime } from '@/lib/money.ts'
import type {
  KvRowsProps,
  PasarelaProps,
  ReceiptProps,
  StatusTrackerProps,
  SupportNoteProps
} from './types.ts'

/** Label / value rows. Values wrap (long names, ids) instead of overflowing. */
export function KvRows({ rows, className }: KvRowsProps) {
  return (
    <dl className={cn('flex w-full flex-col gap-3', className)}>
      {rows.map((row, i) => (
        <div
          key={`${row.label}-${i}`}
          className={cn(
            'flex items-start justify-between gap-3 text-sm leading-snug',
            row.className
          )}
        >
          <dt className="w-[38%] shrink-0 text-neutral-normal">{row.label}</dt>
          <dd
            className={cn(
              'min-w-0 flex-1 text-right font-semibold text-neutral-darker [overflow-wrap:anywhere]',
              row.tone === 'success' && 'text-success',
              row.tone === 'error' && 'text-magenta'
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Support contact (the only contact channels of Insieme). */
export function SupportNote({ className }: SupportNoteProps) {
  return (
    <p
      className={cn(
        'w-full text-center text-2xs leading-relaxed text-neutral-normal',
        className
      )}
    >
      ¿Necesitas ayuda? Escríbenos a{' '}
      <a href="mailto:hola@oplat.co" className="font-medium text-brand">
        hola@oplat.co
      </a>{' '}
      o por WhatsApp al{' '}
      <a
        href="https://wa.me/573332822713"
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap font-medium text-brand"
      >
        333 282 2713
      </a>
      .
    </p>
  )
}

const TITLE_TONE = {
  success: 'text-success',
  error: 'text-magenta',
  warning: 'text-neutral-darker'
} as const

/** Transaction receipt. */
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
      <h1
        className={cn(
          'w-full text-center text-xl font-bold leading-tight',
          TITLE_TONE[tone]
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <div className="w-full text-center text-sm leading-snug text-neutral-darker">
          {subtitle}
        </div>
      ) : null}
      <div className="w-full rounded-2xl border border-brand-soft-active bg-white p-4 shadow-soft">
        <KvRows rows={rows} />
      </div>
      {children}
    </div>
  )
}

/** Small spinner. */
function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Procesando"
      className={cn(
        'h-6 w-6 animate-spin rounded-full border-2 border-brand-soft-active border-t-brand',
        className
      )}
    />
  )
}

/** Loading state with a message. */
export function Pasarela({ icon, message, className }: PasarelaProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-[1_0_0] flex-col items-center justify-center gap-4 py-10',
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
      <p className="text-center text-base leading-snug text-neutral-darker">
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
function stepStates(status: OrderStatus, authorized: boolean): StepState[] {
  const states: StepState[] = ['pending', 'pending', 'pending', 'pending']
  const fill = (done: number, rest?: StepState) => {
    for (let i = 0; i < 4; i++) {
      if (i < done) states[i] = 'done'
      else if (i === done && rest) states[i] = rest
    }
  }
  switch (status) {
    case OrderStatus.PROCESSING:
      if (authorized) fill(1, 'active')
      else fill(0, 'active')
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
  const authorized = events.some((e) =>
    e.message.startsWith('Pagador autorizó')
  )
  const states = stepStates(status, authorized)
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 rounded-2xl border border-brand-soft-active bg-white p-4 shadow-soft',
        className
      )}
    >
      <ol className="flex flex-col">
        {TRACKER_STEPS.map((step, i) => {
          const state = states[i]
          return (
            <li
              key={step}
              aria-current={state === 'active' ? 'step' : undefined}
              className="relative flex items-start gap-3 pb-5 last:pb-0"
            >
              {i < TRACKER_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5',
                    state === 'done' ? 'bg-success' : 'bg-neutral-light-active'
                  )}
                />
              ) : null}
              <span
                className={cn(
                  'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border text-xs font-semibold',
                  state === 'done' && 'border-success bg-success text-white',
                  state === 'active' && 'border-brand bg-white text-brand',
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
                  <Spinner className="h-4 w-4 border-[1.5px]" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'min-w-0 pt-1 text-sm leading-snug',
                  state === 'done' && 'text-neutral-darker',
                  state === 'active' && 'font-semibold text-brand',
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
        <ul className="flex flex-col gap-1.5 border-t border-neutral-light-active pt-3 text-3xs leading-snug text-neutral-normal">
          {events.map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex gap-2">
              <span className="shrink-0 tabular-nums">
                {formatDateTime(event.at)}
              </span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {event.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
