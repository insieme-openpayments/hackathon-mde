import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Primary call to action: brand yellow with dark text. */
const PRIMARY =
  'bg-accent text-accent-text shadow-soft hover:bg-accent-hover active:shadow-none'

export const buttonVariants = cva(
  'inline-flex h-11 select-none items-center justify-center whitespace-nowrap rounded-pill px-5 font-btn text-sm font-semibold leading-none outline-none transition-[background-color,transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[.98] disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        /** Alias of `active`. */
        default: PRIMARY,
        active: PRIMARY,
        disabled:
          'cursor-not-allowed bg-neutral-light-active text-neutral-normal shadow-none',
        dark: 'bg-brand text-white hover:bg-brand-hover',
        solid: 'bg-brand text-white hover:bg-brand-hover',
        outline: 'border border-brand bg-white text-brand hover:bg-brand-soft',
        secondary: 'bg-brand-soft text-brand hover:bg-brand-soft-active',
        link: 'h-auto rounded-none bg-transparent p-0 text-2xs font-medium text-brand underline underline-offset-2 hover:text-brand-hover'
      },
      size: {
        md: '',
        sm: 'h-9 px-4 text-xs'
      },
      fullWidth: {
        true: 'w-full'
      },
      grow: {
        true: 'min-w-0 flex-[1_0_0]'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  'asChild'?: boolean
  'aria-label': string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, grow, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, fullWidth, grow }),
          // A "disabled"-styled button is also blocked from interaction.
          variant === 'disabled' && 'pointer-events-auto',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
