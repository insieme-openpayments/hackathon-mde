import type { Category } from '@/lib/api-types.ts'
import { categoryIcon } from '@/lib/assets.ts'
import { cn } from '@/lib/utils.ts'

interface CategorySelectorProps {
  category: Category | null
  /** Locked (edit screen): not clickable. */
  locked?: boolean
  error?: string
  onOpen?: () => void
}

const CHEVRON = (
  <img
    src="/assets/facturas/chevron-right.svg"
    alt=""
    width={16}
    height={16}
    className="shrink-0"
  />
)

export function CategorySelector({
  category,
  locked,
  error,
  onOpen
}: CategorySelectorProps) {
  const base =
    'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 text-left text-sm text-neutral-darker transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
  return (
    <div className="flex w-full flex-col gap-1">
      {!category ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            base,
            'hover:border-brand',
            error ? 'border-magenta' : 'border-neutral-light-active'
          )}
        >
          <span className="font-medium">Categoría o servicio</span>
          <span className="flex items-center gap-1 text-2xs font-medium text-brand">
            Elegir {CHEVRON}
          </span>
        </button>
      ) : (
        <button
          type="button"
          disabled={locked}
          onClick={onOpen}
          className={cn(
            base,
            'border-neutral-light-active',
            locked ? 'bg-sheet' : 'hover:border-brand'
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
              {category.icon ? (
                <img
                  src={categoryIcon(category.icon)}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-auto"
                />
              ) : null}
            </span>
            <span className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">
              {category.label}
            </span>
          </span>
          {locked ? null : (
            <span className="flex shrink-0 items-center gap-1 text-2xs font-medium text-brand">
              Cambiar {CHEVRON}
            </span>
          )}
        </button>
      )}
      {error ? (
        <p className="px-1 text-2xs text-magenta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
