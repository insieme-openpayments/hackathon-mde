// API contract types (provisional). Mirrors the plan's "Contrato de API".
// Owner: P2 (data-stores) may refine; the shapes below are the contract.

export type ProductType = 'servicio' | 'giro' | 'transferencia'

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
  /** May carry { enabled?: boolean, provider?: string, active?: boolean }. */
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
  /** Null when the bill comes from the real upstream (only the local simulation invents them). */
  holder: string | null
  concept: string | null
  dueDate: string | null
}

export type OrderItemKind = 'servicio' | 'factura' | 'efecty' | 'breb'

/** Details for kind servicio and factura */
export interface ServicioDetails {
  ref1: string
  ref2?: string
  email?: string
  document?: string
}

export interface EfectyDetails {
  recipientDocument: string
  recipientName: string
  recipientPhone?: string
  email?: string
}

export interface BrebDetails {
  key: string
  description?: string
  email?: string
}

/** Details by kind. */
export type OrderItemDetails = ServicioDetails | EfectyDetails | BrebDetails

export type OrderItemInput =
  | {
      productId: string
      quantity?: 1
      kind: 'servicio'
      /** Whole COP units */
      amount?: number
      details: ServicioDetails
    }
  | {
      productId: string
      quantity?: 1
      kind: 'factura'
      amount: number
      details: ServicioDetails
    }
  | {
      productId: string
      quantity?: 1
      kind: 'efecty'
      amount: number
      details: EfectyDetails
    }
  | {
      productId: string
      quantity?: 1
      kind: 'breb'
      amount: number
      details: BrebDetails
    }

export interface EfectyQuote {
  amount: number
  fee: number
  total: number
  currency: string
  minAmount: number
  maxAmount: number
  /** Normalized: digits only */
  recipientDocument: string
  recipientName: string
  message: string
  simulated: boolean
}

export type BrebKeyType = 'phone' | 'email' | 'document' | 'alphanumeric'

export interface BrebKeyResolution {
  key: string
  keyType: BrebKeyType
  exists: true
  holderName: string
  bank: string
  message: string
  simulated: boolean
}

export interface SettlementReceipt {
  reference: string
  status: string
  message?: string
  instructions?: string
  expiresAt?: string | null
  holderName?: string
  bank?: string
  network?: string
}

export enum OrderStatus {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED'
}

export type OrderReceiptItemDetails = Partial<
  ServicioDetails & EfectyDetails & BrebDetails
> & {
  kind: OrderItemKind
  holder?: string | null
  concept?: string | null
  dueDate?: string | null
  trace?: string | null
  fee?: number
  total?: number
  keyType?: BrebKeyType
  holderName?: string
  bank?: string
}

export interface OrderReceiptItem {
  id: string
  productId: string
  quantity: number
  price: number
  details: OrderReceiptItemDetails | null
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
  settlement: {
    authCode: string
    paidAt: string
    amount: number
    receipt: SettlementReceipt | null
  } | null
  /** Timeline for the status tracker. */
  events: Array<{ at: string; message: string }>
}
