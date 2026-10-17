// Layout primitives. Mirror of `App.ui` in customer-frontend/js/core.js.
import { cn } from '@/lib/utils.ts'
import { Logo as LogoMark } from '@/components/icons.tsx'
import type {
  ActionsProps,
  BackButtonProps,
  ByPuntoredProps,
  DialogCardProps,
  LogoProps,
  ScreenProps,
  StepTitleProps,
  TitleBoxProps
} from './types.ts'
import { Tip } from './tip.tsx'

export function Logo({ className }: LogoProps) {
  return <LogoMark className={cn('h-[30px] w-[100px] shrink-0', className)} />
}

export function ByPuntored({ className }: ByPuntoredProps) {
  return (
    <div
      className={cn(
        'flex h-[15px] w-[79px] items-center justify-between',
        className
      )}
    >
      <span className="text-[8px] text-black">By</span>
      <img
        src="/assets/img/puntored-logo.svg"
        alt="Insieme"
        width={60}
        height={15}
        className="h-[15px] w-[60px]"
      />
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
        'flex w-9 shrink-0 flex-col items-center gap-0.5 bg-transparent p-0',
        className
      )}
    >
      <img
        src="/assets/icons/back-button.svg"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9"
      />
      <span className="text-[10px] leading-[1.1] text-text01">{label}</span>
    </button>
  )
}

export function StepTitle({ n, text, tip, className }: StepTitleProps) {
  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-blue-normal text-xs font-medium text-white">
        {n}
      </span>
      <span className="whitespace-nowrap text-sm leading-normal text-black">
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

export function TitleBox({ children, className }: TitleBoxProps) {
  return (
    <h1
      className={cn(
        'w-full text-center text-lg font-normal leading-normal text-neutral-darker',
        className
      )}
    >
      {children}
    </h1>
  )
}

export function Actions({ children, className }: ActionsProps) {
  return (
    <div className={cn('flex w-full items-start gap-2', className)}>
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
        'flex w-full animate-fc-pop flex-col items-center gap-3 rounded-lg bg-white p-4 shadow-soft',
        className
      )}
    >
      {icon ? (
        <img src={icon} alt="" width={34} height={34} className="h-[34px]" />
      ) : null}
      <p
        className={cn(
          'w-full text-center font-semibold leading-[1.2] text-black',
          large ? 'text-base' : 'text-sm'
        )}
      >
        {text}
      </p>
      {children}
    </div>
  )
}
