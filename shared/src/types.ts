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
  /** Equals `slug`, e.g. 'gas-natural-cundi' */
  convenio: string
  slug: string
  name: string
  category: string
  /** Equals `partial` in the prototype */
  requiresManualAmount: boolean
  minAmount: number | null
  maxAmount: number | null
  fixedAmount: number | null
  /** Relative to GET /images/ */
  logo: string | null
  sortOrder: number
  metadata: Record<string, unknown> | null
}

export interface Catalog {
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

export interface OrderItemDetailsInput {
  ref1: string
  ref2?: string
  email?: string
  document?: string
}

export interface OrderItemInput {
  productId: string
  quantity?: 1
  kind: OrderItemKind
  /** Whole COP units */
  amount?: number
  details: OrderItemDetailsInput
}

export type OrderStatus =
  | 'PROCESSING'
  | 'FAILED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'SETTLED'
  | 'SETTLEMENT_FAILED'

export interface OrderReceiptItem {
  id: string
  productId: string
  quantity: number
  price: number
  details:
    | (OrderItemDetailsInput & {
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
  /** NEVER exposes continueToken / continueUri / nonces */
  payments: {
    id: string
    status: string
    quoteId: string
    incomingPaymentUrl: string
    createdAt: string
    updatedAt: string
  } | null
  settlement: { authCode: string; paidAt: string; amount: number } | null
  events: Array<{ at: string; message: string }>
}

export interface CreateOrderResponse {
  redirectUrl: string
  orderId: string
}

export interface InstantBuyResponse {
  accessToken: string
  manageUrl: string
  walletAddressUrl: string
  orderId: string
}

/** GET /admin/orders (internal, unauthenticated): the only place the executing provider is exposed */
export interface AdminOrder {
  id: string
  status: OrderStatus
  settlement: {
    provider: string | null
    authCode: string | null
    attempts: Array<{ provider: string; error: string }>
  } | null
  events: Array<{ at: string; message: string }>
}
