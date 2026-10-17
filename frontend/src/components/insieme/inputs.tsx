// Form inputs (Input-v2 with floating label, money, search).
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
 * Floating-label input (prototype `.sv-input`, 40px high, label sits on the
 * top border). Works with react-hook-form: `<FloatingInput {...register('x')} />`;
 * the error is read from the form context unless `error` is passed.
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
          className={cn('relative h-10 w-full shrink-0', dim && 'opacity-50')}
        >
          <label
            htmlFor={inputId}
            className={cn(
              'flex h-full w-full cursor-text items-center gap-2.5 rounded-md border bg-white p-2.5 transition-colors focus-within:border-blue-normal',
              message ? 'border-magenta' : 'border-blue-light-active'
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
                'm-0 min-w-0 flex-[1_0_0] truncate border-0 bg-transparent p-0 text-xs leading-[1.1] text-neutral-darker placeholder:text-[#5a6369] placeholder:opacity-100 outline-none ring-0 focus:ring-0',
                readOnly && 'cursor-default'
              )}
              {...props}
            />
            {trailing}
          </label>
          <span className="pointer-events-none absolute -top-2.5 left-[19px] flex h-4 items-center whitespace-nowrap bg-white px-0.5 text-xs font-medium leading-[1.1] text-blue-darker">
            {label}
          </span>
        </div>
        {message ? (
          <p
            id={errorId}
            role="alert"
            className="text-[10px] leading-[1.1] text-magenta"
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
      className
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
      className={className}
      inputMode="numeric"
      autoComplete="off"
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

/** Pill search field (prototype `.sv-search`). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Busca por empresa o convenio',
  className
}: SearchInputProps) {
  return (
    <label
      className={cn(
        'flex h-10 w-full cursor-text items-center gap-[15px] rounded-pill border border-neutral-light-active bg-white px-4 py-2.5 focus-within:border-blue-light-active',
        className
      )}
    >
      <img
        src="/assets/servicios/search.svg"
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
        className="m-0 min-w-0 flex-[1_0_0] appearance-none border-0 bg-transparent p-0 text-xs font-medium text-blue-darker opacity-70 outline-none ring-0 placeholder:text-neutral-normal placeholder:opacity-100 focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
  )
}
