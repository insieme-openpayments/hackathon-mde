import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils.ts'

type Tone = 'active' | 'disabled' | 'secondary' | 'dark' | 'yes' | 'no' | 'blue'

const tones: Record<Tone, string> = {
  active: 'bg-accent text-accent-text shadow-soft hover:bg-accent-hover',
  disabled: 'cursor-not-allowed bg-neutral-light-active text-neutral-normal',
  secondary: 'border border-brand bg-white text-brand hover:bg-brand-soft',
  dark: 'bg-brand text-white hover:bg-brand-hover',
  blue: 'bg-brand text-white hover:bg-brand-hover',
  yes: 'bg-brand text-white hover:bg-brand-hover',
  no: 'border border-brand bg-white text-brand hover:bg-brand-soft'
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: Tone
  grow?: boolean
}

/** Pill button used across the Facturas screens. */
export function ActionButton({
  tone,
  grow,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={tone === 'disabled' || undefined}
      className={cn(
        'flex h-11 items-center justify-center rounded-pill px-6 font-btn text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        tones[tone],
        grow && 'min-w-0 flex-1',
        className
      )}
      {...props}
    />
  )
}
