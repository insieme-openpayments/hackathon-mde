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

export function CategorySelector({
  category,
  locked,
  error,
  onOpen
}: CategorySelectorProps) {
  const base =
    'flex h-12 w-full items-center justify-between rounded border border-blue-light-active bg-white px-3 text-sm text-neutral-darker'
  return (
    <div className="flex w-full flex-col gap-1">
      {!category ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(base, error && 'border-magenta')}
        >
          <span>Categoría | Servicio</span>
          <img
            src="/assets/facturas/chevron-right.svg"
            alt=""
            width={16}
            height={16}
          />
        </button>
      ) : (
        <button
          type="button"
          disabled={locked}
          onClick={onOpen}
          className={cn(base, 'justify-between', locked && 'bg-panel')}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-blue-normal">
              {category.icon ? (
                <img
                  src={categoryIcon(category.icon)}
                  alt=""
                  width={20}
                  height={20}
                  className="brightness-0 invert"
                />
              ) : null}
            </span>
            <span>{category.label}</span>
          </span>
          {locked ? null : (
            <span className="flex items-center gap-1 text-xs text-blue-normal">
              Otro
              <img
                src="/assets/facturas/chevron-right.svg"
                alt=""
                width={16}
                height={16}
              />
            </span>
          )}
        </button>
      )}
      {error ? <p className="text-2xs text-magenta">{error}</p> : null}
    </div>
  )
}
