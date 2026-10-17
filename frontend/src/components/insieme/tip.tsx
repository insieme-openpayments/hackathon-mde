// Tooltip: "!" icon that opens a small bubble. Radix Popover, controlled,
// auto-closes after 3.5 s.
import { useEffect, useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover.tsx'
import { cn } from '@/lib/utils.ts'
import type { TipProps } from './types.ts'

export function Tip({
  children,
  defaultOpen = false,
  autoCloseMs = 3500,
  icon = 'exclamation',
  className
}: TipProps) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setOpen(false), autoCloseMs)
    return () => clearTimeout(timer)
  }, [open, autoCloseMs])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Más información"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-transparent p-0 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            icon === 'alert'
              ? 'h-5 w-5'
              : 'h-4 w-4 border border-brand bg-white',
            className
          )}
        >
          {icon === 'alert' ? (
            <img
              src="/assets/icons/alert-circle.svg"
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 max-w-none"
            />
          ) : (
            <img
              src="/assets/icons/exclamation.svg"
              alt=""
              width={10}
              height={10}
              className="h-2.5 w-2.5"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        role="tooltip"
        sideOffset={4}
        className={cn(
          'w-auto max-w-[260px] rounded-xl border border-brand-soft-active bg-white px-3 py-2 text-2xs leading-snug text-neutral-darker shadow-medium'
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
