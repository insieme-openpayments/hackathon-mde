// Form inputs. STUB - P1 (design-system) restyles (floating labels etc.).
import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils.ts'
import { num } from '@/lib/money.ts'
import type {
  FloatingInputProps,
  MoneyInputProps,
  SearchInputProps
} from './types.ts'

/** Works with react-hook-form: `<FloatingInput {...form.register('x')} />`. */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, trailing, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    return (
      <div className="flex w-full flex-col gap-1">
        <label
          htmlFor={inputId}
          className={cn(
            'flex w-full items-center gap-2 rounded border border-blue-light-active bg-white px-3 py-2 text-sm',
            error && 'border-magenta',
            className
          )}
        >
          <span className="sr-only">{label}</span>
          <input
            ref={ref}
            id={inputId}
            placeholder={label}
            aria-invalid={error ? true : undefined}
            className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
            {...props}
          />
          {trailing}
        </label>
        {error ? <p className="text-2xs text-magenta">{error}</p> : null}
      </div>
    )
  }
)
FloatingInput.displayName = 'FloatingInput'

/** Shows "$ 10.000"; stores a whole number. */
export function MoneyInput({
  value,
  onChange,
  label,
  error,
  disabled,
  readOnly,
  name,
  id,
  className
}: MoneyInputProps) {
  return (
    <FloatingInput
      id={id}
      name={name}
      label={label}
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      inputMode="numeric"
      value={value == null ? '' : '$ ' + num(value)}
      onChange={(e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '')
        onChange(digitsOnly ? Number(digitsOnly) : null)
      }}
    />
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar',
  className
}: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={cn(
        'w-full rounded border border-blue-light-active bg-white px-3 py-2 text-sm',
        className
      )}
    />
  )
}
