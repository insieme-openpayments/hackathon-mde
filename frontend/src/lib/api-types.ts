// API contract types (provisional). Mirrors the plan's "Contrato de API".
// Owner: P2 (data-stores) may refine; the shapes below are the contract.

export type ProductType = 'servicio'

export interface Category {
  id: string
  label: string
  icon: string | null
  sortOrder: number
}

export interface CatalogProduct {
  id: string
  type: ProductType
  /** Same as `slug`, e.g. 'gas-natural-cundi'. */
  convenio: string
  slug: string
  name: string
  category: string
  /** Prototype `partial`: the payer may pay less than the bill. */
  requiresManualAmount: boolean
  minAmount: number | null
  maxAmount: number | null
  fixedAmount: number | null
  /** Relative to GET /images/. */
  logo: string | null
  sortOrder: number
  metadata: Record<string, unknown> | null
}

export interface CatalogResponse {
  categories: Category[]
  products: CatalogProduct[]
}

export interface BillLookupResult {
  productId: string
  convenio: string
  name: string
  category: string
  ref1: string
  amount: number
  partial: boolean
  minAmount: number
  maxAmount: number
  fixedAmount: number | null
  holder: string
  concept: string
  dueDate: string | null
}

export type OrderItemKind = 'servicio' | 'factura'

export interface OrderItemDetails {
  ref1: string
  ref2?: string
  email?: string
  document?: string
}

export interface OrderItemInput {
  productId: string
  quantity?: 1
  kind: OrderItemKind
  /** Whole COP units (major units). */
  amount?: number
  details: OrderItemDetails
}

export enum OrderStatus {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED'
}

export interface OrderReceiptItem {
  id: string
  productId: string
  quantity: number
  price: number
  details:
    | (OrderItemDetails & {
        kind: OrderItemKind
        holder?: string
        concept?: string
        dueDate?: string | null
      })
    | null
  product: CatalogProduct
}

export interface OrderReceipt {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
  updatedAt: string
  orderItems: OrderReceiptItem[]
  /** Never carries continueToken/continueUri/nonces. */
  payments: {
    id: string
    status: string
    quoteId: string
    incomingPaymentUrl: string
    createdAt: string
    updatedAt: string
  } | null
  /** Public view: no provider. */
  settlement: { authCode: string; paidAt: string; amount: number } | null
  /** Timeline for the status tracker. */
  events: Array<{ at: string; message: string }>
}
