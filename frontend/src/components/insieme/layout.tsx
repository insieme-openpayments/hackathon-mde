// Layout primitives of the Insieme design system.
import { cn } from '@/lib/utils.ts'
import type {
  ActionsProps,
  BackButtonProps,
  BrandFooterProps,
  DialogCardProps,
  LogoProps,
  ScreenProps,
  StepTitleProps,
  TitleBoxProps
} from './types.ts'
import { Tip } from './tip.tsx'

/** Horizontal "&insieme" logo. Carries the purple background: use it on brand surfaces. */
export function Logo({ className }: LogoProps) {
  return (
    <img
      src="/brand/logo-insieme.png"
      alt="Insieme"
      width={129}
      height={36}
      className={cn('h-9 w-auto shrink-0 select-none', className)}
    />
  )
}

/** "&" isotype (purple rounded square). */
export function Isotipo({
  className,
  size = 40
}: LogoProps & { size?: number }) {
  return (
    <img
      src="/brand/isotipo-insieme.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cn('shrink-0 select-none rounded-xl', className)}
      style={{ width: size, height: size }}
    />
  )
}

/** Footer note shown at the end of every screen. */
export function BrandFooter({ className }: BrandFooterProps) {
  return (
    <div
      className={cn(
        'mt-auto flex w-full items-center justify-center gap-2 pt-2 text-3xs text-neutral-normal',
        className
      )}
    >
      <Isotipo size={18} className="rounded-[5px]" />
      <span>
        Pagos seguros con{' '}
        <span className="font-semibold text-allies">
          Interledger Open Payments
        </span>
      </span>
    </div>
  )
}

export function BackButton({
  onClick,
  label = 'Volver',
  className
}: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-soft-active bg-white text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
    </button>
  )
}

export function StepTitle({ n, text, tip, className }: StepTitleProps) {
  return (
    <div className={cn('relative flex items-start gap-2', className)}>
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand text-xs font-semibold text-white">
        {n}
      </span>
      <span className="min-w-0 text-sm font-medium leading-6 text-neutral-darker">
        {text}
      </span>
      {tip ? <Tip>{tip}</Tip> : null}
    </div>
  )
}

export function Screen({ children, gray, className }: ScreenProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-1 animate-screen-in flex-col gap-4',
        gray && 'bg-sheet',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TitleBox({
  children,
  variant = 'box',
  className
}: TitleBoxProps) {
  return (
    <h1
      className={cn(
        variant === 'box'
          ? 'flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-soft px-4 text-center text-base font-bold text-brand'
          : 'w-full text-center text-xl font-bold leading-tight text-neutral-darker',
        className
      )}
    >
      {children}
    </h1>
  )
}

export function Actions({ children, className }: ActionsProps) {
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      {children}
    </div>
  )
}

export function DialogCard({
  icon,
  text,
  large,
  children,
  className
}: DialogCardProps) {
  return (
    <div
      className={cn(
        'flex w-full animate-fc-pop flex-col items-center gap-4 rounded-2xl border border-brand-soft-active bg-white p-6 shadow-soft',
        className
      )}
    >
      {icon ? (
        <img src={icon} alt="" width={40} height={40} className="h-10 w-10" />
      ) : null}
      <p
        className={cn(
          'w-full text-center font-semibold leading-snug text-neutral-darker',
          large ? 'text-lg' : 'text-base'
        )}
      >
        {text}
      </p>
      {children}
    </div>
  )
}
