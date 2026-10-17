// Category / company lists. STUB - P1 (design-system) restyles.
import { cn } from '@/lib/utils.ts'
import { resolveAssetUrl } from '@/lib/assets.ts'
import type {
  CategoryCardProps,
  CategoryGridProps,
  CompanyListProps,
  CompanyLogoProps,
  CompanyRowProps,
  SortSelectProps,
  SortOrder
} from './types.ts'

export function CategoryCard({
  category,
  onSelect,
  className
}: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={cn(
        'flex items-center gap-2 rounded border border-blue-light-active bg-white p-2 text-left text-xs hover:border-blue-normal hover:shadow-soft',
        className
      )}
    >
      {category.label}
    </button>
  )
}

export function CategoryGrid({
  categories,
  onSelect,
  className
}: CategoryGridProps) {
  return (
    <div className={cn('grid w-full grid-cols-2 gap-2', className)}>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export function CompanyLogo({ name, logo, className }: CompanyLogoProps) {
  if (logo) {
    return (
      <img
        src={resolveAssetUrl(logo)}
        alt={name}
        className={cn('h-8 w-8 object-contain', className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-pill bg-panel text-xs font-semibold',
        className
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function CompanyRow({ product, onSelect, className }: CompanyRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={cn(
        'flex w-full items-center gap-3 rounded bg-white p-2 text-left text-sm hover:bg-panel',
        className
      )}
    >
      <CompanyLogo name={product.name} logo={product.logo} />
      <span>{product.name}</span>
    </button>
  )
}

export function CompanyList({
  products,
  onSelect,
  empty,
  className
}: CompanyListProps) {
  if (products.length === 0) return <>{empty ?? null}</>
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {products.map((product) => (
        <CompanyRow key={product.id} product={product} onSelect={onSelect} />
      ))}
    </div>
  )
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <select
      value={value}
      aria-label="Ordenar"
      onChange={(e) => onChange(e.target.value as SortOrder)}
      className={cn(
        'rounded border border-blue-light-active bg-white px-2 py-1 text-xs',
        className
      )}
    >
      <option value="asc">A - Z</option>
      <option value="desc">Z - A</option>
    </select>
  )
}
