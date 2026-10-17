import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const ACTIVE = 'bg-lime text-lime-text hover:bg-lime-hover'

export const buttonVariants = cva(
  'inline-flex h-9 select-none items-center justify-center whitespace-nowrap rounded p-2.5 font-btn text-xs font-medium leading-[1.1] outline-none transition-[background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-blue-normal focus-visible:ring-offset-2 active:scale-[.98] disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        /** Alias of `active`. */
        default: ACTIVE,
        active: ACTIVE,
        disabled: 'cursor-not-allowed bg-blue-btn text-white',
        dark: 'bg-blue-btn text-white hover:bg-blue-hover',
        solid:
          'border border-blue-normal bg-blue-normal font-sans text-white hover:bg-blue-hover',
        outline:
          'border border-blue-normal bg-transparent font-sans text-blue-normal hover:bg-blue-light-hover',
        secondary:
          'bg-blue-light-hover font-sans text-blue-normal hover:bg-blue-light-active',
        link: 'h-auto bg-transparent p-0 font-sans text-[10px] font-normal text-blue-normal underline hover:text-blue-hover'
      },
      size: {
        md: ''
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
