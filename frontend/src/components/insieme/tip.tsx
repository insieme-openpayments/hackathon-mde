// Tooltip (Figma 190:15880): "!" icon that opens a small bubble.
// Radix Popover, controlled, auto-closes after 3.5 s.
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
            'inline-flex shrink-0 items-center justify-center bg-transparent p-0',
            icon === 'alert'
              ? 'h-[18px] w-[18px]'
              : 'h-[14px] w-[14px] rounded-full border border-blue-normal bg-white p-px',
            className
          )}
        >
          {icon === 'alert' ? (
            <img
              src="/assets/icons/alert-circle.svg"
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] max-w-none"
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
        sideOffset={3}
        className={cn(
          'w-auto max-w-[240px] text-blue-darker shadow-none',
          icon === 'alert'
            ? 'rounded-md border-0 bg-panel p-2.5 text-[10px] leading-[1.1]'
            : 'rounded border border-blue-normal bg-white px-2 py-1 text-[8px] leading-[9px]'
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
