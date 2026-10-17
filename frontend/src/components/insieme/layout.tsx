// Layout primitives. STUB - P1 (design-system) restyles to match the prototype.
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
  return <LogoMark className={cn('h-[30px] w-[100px]', className)} />
}

export function ByPuntored({ className }: ByPuntoredProps) {
  return (
    <div className={cn('flex items-center gap-1 text-3xs', className)}>
      <span>By</span>
      <span className="font-semibold">Insieme</span>
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
      className={cn('flex w-9 flex-col items-center gap-0.5', className)}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-blue-normal text-white">
        ‹
      </span>
      <span className="text-2xs text-text01">{label}</span>
    </button>
  )
}

export function StepTitle({ n, text, tip, className }: StepTitleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-pill bg-blue-normal text-xs font-medium text-white">
        {n}
      </span>
      <span className="whitespace-nowrap text-sm text-black">{text}</span>
      {tip ? <Tip>{tip}</Tip> : null}
    </div>
  )
}

export function Screen({ children, gray, className }: ScreenProps) {
  return (
    <div
      className={cn(
        'flex w-full animate-screen-in flex-col gap-4',
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
        'w-full text-center text-lg text-neutral-darker',
        className
      )}
    >
      {children}
    </h1>
  )
}

export function Actions({ children, className }: ActionsProps) {
  return (
    <div className={cn('flex w-full items-end gap-2', className)}>
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
      {icon ? <img src={icon} alt="" width={34} height={34} /> : null}
      <p
        className={cn(
          'w-full text-center text-sm font-bold text-black',
          large && 'text-base'
        )}
      >
        {text}
      </p>
      {children}
    </div>
  )
}
