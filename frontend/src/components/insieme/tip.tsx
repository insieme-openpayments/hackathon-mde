// STUB - P1 (design-system) restyles. Radix Popover, auto-closes after 3.5 s.
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
            'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-pill text-2xs font-bold text-white',
            icon === 'alert' ? 'bg-magenta' : 'bg-blue-normal',
            className
          )}
        >
          !
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 text-xs">{children}</PopoverContent>
    </Popover>
  )
}
