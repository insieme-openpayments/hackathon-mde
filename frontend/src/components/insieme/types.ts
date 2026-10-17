// Prop contracts of the Insieme design-system components (mirror of
// `App.ui` in the retired prototype, ef76b86:customer-frontend/js/core.js). Implemented by P1 (design-system).
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode
} from 'react'
import type {
  CatalogProduct,
  Category,
  OrderItemKind,
  OrderStatus
} from '@/lib/api-types.ts'

export interface ClassNameProp {
  className?: string
}

export type LogoProps = ClassNameProp
export type BrandFooterProps = ClassNameProp

export interface BackButtonProps extends ClassNameProp {
  onClick: () => void
  /** Defaults to "Volver". */
  label?: string
}

export interface StepTitleProps extends ClassNameProp {
  n: number
  text: string
  /** Tooltip content rendered inside a <Tip/>. */
  tip?: ReactNode
}

export interface TipProps extends ClassNameProp {
  children: ReactNode
  /** Starts open. Auto-closes after `autoCloseMs` (default 3500). */
  defaultOpen?: boolean
  autoCloseMs?: number
  icon?: 'exclamation' | 'alert'
}

export interface FloatingInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /**
   * Error message. When omitted, the message is read from the surrounding
   * react-hook-form context (`formState.errors[name]`), if any.
   */
  error?: string
  /** Element shown at the start of the field (icon). */
  leading?: ReactNode
  /** Element shown at the end of the field (icon, button). */
  trailing?: ReactNode
  /** Dimmed (50% opacity) look, used for locked fields. */
  dim?: boolean
}

export interface MoneyInputProps extends ClassNameProp {
  /** Whole COP units; null when empty. */
  value: number | null
  onChange: (value: number | null) => void
  label: string
  error?: string
  disabled?: boolean
  readOnly?: boolean
  dim?: boolean
  trailing?: ReactNode
  name?: string
  id?: string
  onBlur?: () => void
  placeholder?: string
}

export interface SearchInputProps extends ClassNameProp {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface CategoryCardProps extends ClassNameProp {
  category: Category
  /** Omit (or use variant "plain") for a non-interactive card. */
  onSelect?: (categoryId: string) => void
  /** plain: centered, borderless header card. selected: highlighted. */
  variant?: 'default' | 'plain' | 'selected'
}

export interface CategoryGridProps extends ClassNameProp {
  categories: Category[]
  onSelect: (categoryId: string) => void
  selectedId?: string | null
}

export interface CompanyLogoProps extends ClassNameProp {
  name: string
  /** Catalog `logo` path (relative to GET /images/) or null for initials. */
  logo: string | null
  /** metadata.logoFit of the product: contain, cover, icetex, ... */
  fit?: string | null
}

export interface CompanyRowProps extends ClassNameProp {
  product: CatalogProduct
  onSelect: (product: CatalogProduct) => void
}

export interface CompanyListProps extends ClassNameProp {
  products: CatalogProduct[]
  onSelect: (product: CatalogProduct) => void
  /** Rendered when `products` is empty. */
  empty?: ReactNode
}

export type SortOrder = 'asc' | 'desc'

export interface SortSelectProps extends ClassNameProp {
  value: SortOrder
  onChange: (value: SortOrder) => void
}

export interface KvRow {
  label: string
  value: ReactNode
  className?: string
  /** success: value in green (e.g. approved status). */
  tone?: 'success' | 'error'
}

export interface KvRowsProps extends ClassNameProp {
  rows: KvRow[]
}

export type SupportNoteProps = ClassNameProp

export interface ReceiptProps extends ClassNameProp {
  /** e.g. "¡Transacción exitosa!" */
  title: string
  tone?: 'success' | 'error' | 'warning'
  subtitle?: ReactNode
  rows: KvRow[]
  /** Actions rendered below the receipt (e.g. "Volver al inicio"). */
  children?: ReactNode
}

export interface PasarelaProps extends ClassNameProp {
  /** Icon URL (defaults to none). */
  icon?: string
  message?: ReactNode
}

export interface StatusTrackerProps extends ClassNameProp {
  status: OrderStatus
  /** Defaults to servicio. */
  kind?: OrderItemKind
  events: Array<{ at: string; message: string }>
}

export interface DialogCardProps extends ClassNameProp {
  icon?: string
  text: ReactNode
  large?: boolean
  /** Buttons. */
  children?: ReactNode
}

export interface TitleBoxProps extends ClassNameProp {
  children: ReactNode
  /** box: grey facturas title (default); plain: simple heading. */
  variant?: 'box' | 'plain'
}

export interface ActionsProps extends ClassNameProp {
  children: ReactNode
}

export interface ScreenProps extends ClassNameProp {
  children: ReactNode
  /** Gray (#f5f5f5) background instead of white. */
  gray?: boolean
}

export type InsiemeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
