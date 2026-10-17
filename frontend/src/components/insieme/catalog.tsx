// Category grid, company list, logos and sort dropdown (servicios.css / facturas.css).
import { useState, type CSSProperties } from 'react'
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
  'flex h-12 w-full items-center gap-2 rounded-[10px] border bg-white p-2 text-left'

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
        <span className="flex h-[27px] w-[27px] shrink-0 items-center justify-center">
          <img
            src={icon}
            alt=""
            className="h-[27px] w-auto max-w-[27px] shrink-0"
          />
        </span>
      ) : null}
      <span className="h-5 w-px shrink-0 bg-blue-normal" aria-hidden="true" />
      <span
        className={cn(
          'min-w-0 text-[10px] leading-[1.1] tracking-[-0.1px] text-neutral-darker',
          variant === 'plain' ? 'flex-none' : 'flex-[1_0_0]'
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
          variant === 'plain' && 'justify-center border-0',
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
        'transition-[border-color,box-shadow] duration-150 hover:border-blue-normal hover:shadow-soft focus-visible:border-blue-normal focus-visible:shadow-soft focus-visible:outline-none',
        variant === 'selected'
          ? 'border-blue-normal shadow-soft'
          : 'border-[#d3d4d3]',
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
    <div className={cn('grid w-full grid-cols-2 gap-2', className)}>
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

const FALLBACK_LOGO = '/assets/servicios/receipt.svg'

/** Image crops per `metadata.logoFit` (as laid out in the Figma). */
const IMG_ABS: CSSProperties = { position: 'absolute', maxWidth: 'none' }
const FILL: CSSProperties = {
  ...IMG_ABS,
  inset: 0,
  width: '100%',
  height: '100%'
}
const FITS: Record<
  string,
  { box?: CSSProperties; inner?: CSSProperties; img: CSSProperties }
> = {
  contain: { img: { ...FILL, objectFit: 'contain' } },
  cover: { img: { ...FILL, objectFit: 'cover' } },
  icetex: {
    img: {
      ...IMG_ABS,
      width: '108.3%',
      height: '391.3%',
      left: '-4.06%',
      top: '-142.39%'
    }
  },
  gasnatural: {
    img: {
      ...IMG_ABS,
      width: '100%',
      height: '250%',
      left: 0,
      top: '-73.93%'
    }
  },
  ricas: {
    inner: { inset: '17.5% 4.17% 17.5% 5.42%' },
    img: {
      ...IMG_ABS,
      width: '110.6%',
      height: '153.85%',
      left: '-5.99%',
      top: '-26.92%'
    }
  },
  vanti: {
    box: { overflow: 'visible' },
    inner: {
      inset: 'auto 0 auto 1.54%',
      top: '50%',
      transform: 'translateY(-50%)',
      aspectRatio: '286 / 134'
    },
    img: {
      ...IMG_ABS,
      width: '209.79%',
      height: '335.82%',
      left: '-54.9%',
      top: '-117.91%'
    }
  }
}

/** 40x16 logo box. Without a logo shows the generic receipt icon. */
export function CompanyLogo({ name, logo, fit, className }: CompanyLogoProps) {
  if (!logo || fit === 'generic') {
    return (
      <span className={cn('flex h-full w-10 shrink-0 items-center', className)}>
        <img
          src={FALLBACK_LOGO}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4"
        />
      </span>
    )
  }
  const spec = FITS[fit ?? 'contain'] ?? FITS.contain
  return (
    <span className={cn('flex h-full w-10 shrink-0 items-center', className)}>
      <span
        className="relative block h-4 w-10 overflow-hidden"
        style={spec.box}
      >
        <span
          className="absolute inset-0 block overflow-hidden"
          style={spec.inner}
        >
          <img
            src={resolveAssetUrl(logo)}
            alt={name}
            style={spec.img}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_LOGO
              e.currentTarget.removeAttribute('style')
              e.currentTarget.className = 'h-4 w-4'
            }}
          />
        </span>
      </span>
    </span>
  )
}

const ROW =
  'flex h-[30px] w-full shrink-0 items-center gap-2 overflow-hidden border-b-[.5px] border-[#78848c] bg-panel px-2.5 py-1 text-left'

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
        'hover:bg-neutral-light-active focus-visible:bg-neutral-light-active focus-visible:outline-none',
        className
      )}
    >
      <CompanyLogo name={product.name} logo={product.logo} fit={fit} />
      <span className="line-clamp-2 min-w-0 flex-[1_0_0] text-xs font-medium leading-[1.1] text-blue-darker opacity-70">
        {product.name}
      </span>
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
        'no-scrollbar flex w-full flex-col overflow-y-auto overflow-x-hidden rounded-lg',
        className
      )}
    >
      {products.length === 0
        ? (empty ?? (
            <div className={cn(ROW, 'h-auto min-h-[30px] py-1.5')}>
              <span className="min-w-0 flex-[1_0_0] text-xs font-medium leading-[1.1] text-blue-darker opacity-70">
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
  asc: 'Ordenar por A-Z',
  desc: 'Ordenar por Z-A'
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
          className={cn(
            'flex w-[117px] items-center justify-center gap-2.5 whitespace-nowrap rounded bg-panel px-2.5 py-1 text-[10px] leading-[1.1] text-[#444a4f] shadow-soft',
            className
          )}
        >
          <span>{SORT_LABELS[value]}</span>
          <img
            src="/assets/icons/chevron-down.svg"
            alt=""
            width={16}
            height={16}
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={0}
        role="listbox"
        className="flex w-[117px] flex-col overflow-hidden rounded border-0 bg-panel p-0 shadow-soft"
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
              'w-full whitespace-nowrap px-2.5 py-1 text-left text-[10px] leading-[1.1]',
              key === value
                ? 'bg-[#87959e] text-white'
                : 'text-[#444a4f] hover:bg-neutral-light-active'
            )}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
