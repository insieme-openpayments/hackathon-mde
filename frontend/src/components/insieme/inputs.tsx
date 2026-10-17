import { publicUrl } from '@/lib/assets.ts'
// Form inputs (floating label, money, search).
import { forwardRef, useId } from 'react'
import { get, useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils.ts'
import type {
  FloatingInputProps,
  MoneyInputProps,
  SearchInputProps
} from './types.ts'

/** Error message of `name` from the surrounding RHF form, if there is one. */
function useContextError(name: string | undefined): string | undefined {
  const form = useFormContext() as ReturnType<typeof useFormContext> | null
  if (!form || !name) return undefined
  const message = (get(form.formState.errors, name) as { message?: unknown })
    ?.message
  return typeof message === 'string' ? message : undefined
}

/**
 * Floating-label input (48px high, label sits on the top border). Works with
 * react-hook-form: `<FloatingInput {...register('x')} />`; the error is read
 * from the form context unless `error` is passed.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      label,
      error,
      leading,
      trailing,
      dim,
      className,
      id,
      readOnly,
      name,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const contextError = useContextError(name)
    const message = error ?? contextError
    const errorId = `${inputId}-error`

    return (
      <div className={cn('flex w-full flex-col gap-1', className)}>
        <div
          className={cn('relative h-12 w-full shrink-0', dim && 'opacity-60')}
        >
          <label
            htmlFor={inputId}
            className={cn(
              'flex h-full w-full cursor-text items-center gap-2.5 rounded-xl border bg-white px-3.5 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand',
              message ? 'border-magenta' : 'border-neutral-light-active',
              (readOnly || props.disabled) && 'bg-sheet'
            )}
          >
            {leading}
            <input
              ref={ref}
              id={inputId}
              name={name}
              readOnly={readOnly}
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? errorId : undefined}
              className={cn(
                'm-0 min-w-0 flex-[1_0_0] truncate border-0 bg-transparent p-0 text-sm leading-tight text-neutral-darker outline-none ring-0 placeholder:text-neutral-normal placeholder:opacity-100 focus:ring-0 disabled:cursor-default disabled:text-neutral-darker',
                readOnly && 'cursor-default'
              )}
              {...props}
            />
            {trailing}
          </label>
          <span
            className={cn(
              'pointer-events-none absolute -top-2 left-3 flex h-4 items-center whitespace-nowrap rounded px-1 text-2xs font-semibold leading-none',
              message ? 'text-magenta' : 'text-brand',
              readOnly || props.disabled ? 'bg-sheet' : 'bg-white'
            )}
          >
            {label}
          </span>
        </div>
        {message ? (
          <p
            id={errorId}
            role="alert"
            className="px-1 text-2xs leading-snug text-magenta"
          >
            {message}
          </p>
        ) : null}
      </div>
    )
  }
)
FloatingInput.displayName = 'FloatingInput'

const MAX_MONEY_DIGITS = 9

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/**
 * Shows "$ 10.000" (es-CO grouping) and reports a whole number of COP.
 * Use inside react-hook-form with `Controller`.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      label,
      error,
      disabled,
      readOnly,
      dim,
      trailing,
      name,
      id,
      className,
      placeholder
    },
    ref
  ) => (
    <FloatingInput
      ref={ref}
      id={id}
      name={name}
      label={label}
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      dim={dim}
      trailing={trailing}
      className={cn('[&_input]:text-base [&_input]:font-semibold', className)}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value == null ? '' : '$ ' + group(value)}
      onBlur={onBlur}
      onChange={(e) => {
        const digitsOnly = e.target.value
          .replace(/\D/g, '')
          .slice(0, MAX_MONEY_DIGITS)
        onChange(digitsOnly ? Number(digitsOnly) : null)
      }}
    />
  )
)
MoneyInput.displayName = 'MoneyInput'

/** Pill search field. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Busca por empresa o convenio',
  className
}: SearchInputProps) {
  return (
    <label
      className={cn(
        'flex h-12 w-full cursor-text items-center gap-3 rounded-pill border border-neutral-light-active bg-white px-4 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand',
        className
      )}
    >
      <img
        src={publicUrl('assets/servicios/search.svg')}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 shrink-0"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="m-0 min-w-0 flex-[1_0_0] appearance-none border-0 bg-transparent p-0 text-sm font-medium text-neutral-darker outline-none ring-0 placeholder:text-neutral-normal placeholder:opacity-100 focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  )
}
