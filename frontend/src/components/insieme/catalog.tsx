import { publicUrl } from '@/lib/assets.ts'
// Category grid, company list, logos and sort dropdown.
import { useState } from 'react'
import { cn } from '@/lib/utils.ts'
import { categoryIcon, resolveAssetUrl } from '@/lib/assets.ts'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover.tsx'
import type {
  CategoryCardProps,
  CategoryGridProps,
  CompanyListProps,
  CompanyLogoProps,
  CompanyRowProps,
  SortSelectProps,
  SortOrder
} from './types.ts'

const CARD =
  'flex min-h-[56px] w-full items-center gap-3 rounded-xl border bg-white px-3 py-2 text-left'

export function CategoryCard({
  category,
  onSelect,
  variant = 'default',
  className
}: CategoryCardProps) {
  const icon = categoryIcon(category.icon ?? category.id)
  const content = (
    <>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
          <img src={icon} alt="" className="h-6 w-auto max-w-[24px] shrink-0" />
        </span>
      ) : null}
      <span
        className={cn(
          'min-w-0 break-words text-sm font-medium leading-tight text-neutral-darker',
          variant === 'plain' ? 'flex-none text-base font-semibold' : 'flex-1'
        )}
      >
        {category.label}
      </span>
    </>
  )

  if (variant === 'plain' || !onSelect) {
    return (
      <div
        className={cn(
          CARD,
          'border-transparent',
          variant === 'plain' && 'justify-center border-0 bg-transparent',
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-pressed={variant === 'selected' ? true : undefined}
      className={cn(
        CARD,
        'transition-[border-color,box-shadow,background-color] duration-150 hover:border-brand hover:shadow-soft focus-visible:border-brand focus-visible:shadow-soft focus-visible:outline-none',
        variant === 'selected'
          ? 'border-brand bg-brand-soft shadow-soft'
          : 'border-neutral-light-active',
        className
      )}
    >
      {content}
    </button>
  )
}

export function CategoryGrid({
  categories,
  onSelect,
  selectedId,
  className
}: CategoryGridProps) {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-1 gap-2.5 min-[360px]:grid-cols-2',
        className
      )}
    >
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onSelect={onSelect}
          variant={category.id === selectedId ? 'selected' : 'default'}
        />
      ))}
    </div>
  )
}

const FALLBACK_LOGO = publicUrl('assets/servicios/receipt.svg')

/**
 * Company logo in a fixed 56x28 box. Logos are trimmed to their content
 * server-side, so `object-contain` keeps their proportions.
 */
export function CompanyLogo({ name, logo, fit, className }: CompanyLogoProps) {
  const generic = !logo || fit === 'generic'
  return (
    <span
      className={cn(
        'flex h-7 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white',
        className
      )}
    >
      {generic ? (
        <img
          src={FALLBACK_LOGO}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] opacity-70"
        />
      ) : (
        <img
          src={resolveAssetUrl(logo)}
          alt={name}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_LOGO
            e.currentTarget.className = 'h-[18px] w-[18px] opacity-70'
          }}
        />
      )}
    </span>
  )
}

const ROW =
  'flex min-h-[48px] w-full shrink-0 items-center gap-3 border-b border-neutral-light-active bg-white px-3 py-2 text-left last:border-b-0'

export function CompanyRow({ product, onSelect, className }: CompanyRowProps) {
  const fit =
    typeof product.metadata?.logoFit === 'string'
      ? product.metadata.logoFit
      : null
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => onSelect(product)}
      className={cn(
        ROW,
        'transition-colors hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:outline-none',
        className
      )}
    >
      <CompanyLogo name={product.name} logo={product.logo} fit={fit} />
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-neutral-darker [overflow-wrap:anywhere]">
        {product.name}
      </span>
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 text-brand"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  )
}

export function CompanyList({
  products,
  onSelect,
  empty,
  className
}: CompanyListProps) {
  return (
    <div
      role="listbox"
      className={cn(
        'no-scrollbar flex w-full flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-neutral-light-active bg-white',
        className
      )}
    >
      {products.length === 0
        ? (empty ?? (
            <div className={cn(ROW, 'h-auto')}>
              <span className="min-w-0 flex-1 text-sm text-neutral-normal">
                No encontramos empresas o convenios con ese nombre
              </span>
            </div>
          ))
        : products.map((product) => (
            <CompanyRow
              key={product.id}
              product={product}
              onSelect={onSelect}
            />
          ))}
    </div>
  )
}

const SORT_LABELS: Record<SortOrder, string> = {
  asc: 'A-Z',
  desc: 'Z-A'
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Ordenar por ${SORT_LABELS[value]}`}
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-neutral-light-active bg-white px-3 text-2xs font-medium text-neutral-darker hover:border-brand',
            className
          )}
        >
          <span>Ordenar {SORT_LABELS[value]}</span>
          <img
            src={publicUrl('assets/icons/chevron-down.svg')}
            alt=""
            width={16}
            height={16}
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        role="listbox"
        className="flex w-36 flex-col overflow-hidden rounded-xl border border-neutral-light-active bg-white p-1 shadow-medium"
      >
        {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={key === value}
            onClick={() => {
              onChange(key)
              setOpen(false)
            }}
            className={cn(
              'w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-2xs font-medium',
              key === value
                ? 'bg-brand text-white'
                : 'text-neutral-darker hover:bg-brand-soft'
            )}
          >
            Ordenar {SORT_LABELS[key]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
