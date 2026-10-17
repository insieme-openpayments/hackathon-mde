import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils.ts'

type Tone = 'active' | 'disabled' | 'secondary' | 'dark' | 'yes' | 'no' | 'blue'

const tones: Record<Tone, string> = {
  active: 'bg-lime text-lime-text hover:bg-lime-hover',
  disabled: 'cursor-not-allowed bg-neutral-light-active text-neutral-normal',
  secondary: 'border border-blue-normal bg-white text-blue-normal',
  dark: 'bg-blue-normal text-white hover:bg-blue-hover',
  blue: 'bg-blue-hover text-white hover:bg-blue-normal',
  yes: 'bg-blue-normal text-white hover:bg-blue-hover',
  no: 'border border-blue-normal bg-white text-blue-normal'
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: Tone
  grow?: boolean
}

/** Local prototype-style button (keeps P4 independent of ui/button variants). */
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
        'flex h-10 items-center justify-center rounded-pill px-6 font-btn text-sm font-medium transition-colors',
        tones[tone],
        grow && 'flex-1',
        className
      )}
      {...props}
    />
  )
}
