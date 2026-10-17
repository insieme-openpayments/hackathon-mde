// Payment draft: written before any redirect, read when the user returns.
// Owner: P5 (payment+confirmation) refines; shape is the contract.
import { resetStore, valtioPersist } from '../valtio-persist'
import type { OrderItemKind } from '../api-types'
import { loadGuard } from './load-guard'
import { z } from 'zod'

export interface PaymentDraftState {
  productId: string
  ref1: string
  ref2: string
  amount: number | null
  email: string
  kind: OrderItemKind
  facturaId: string
  /** Route to go back to after the one-click setup round trip. */
  returnTo: string
}

const defaults: PaymentDraftState = {
  productId: '',
  ref1: '',
  ref2: '',
  amount: null,
  email: '',
  kind: 'servicio',
  facturaId: '',
  returnTo: ''
}

loadGuard(
  'payment-draft-store',
  z.object({
    productId: z.string(),
    ref1: z.string(),
    ref2: z.string(),
    amount: z.number().nullable(),
    email: z.string(),
    kind: z.enum(['servicio', 'factura']),
    facturaId: z.string(),
    returnTo: z.string()
  })
)

export const paymentDraftStore = valtioPersist<PaymentDraftState>(
  'payment-draft-store',
  { ...defaults }
)

export function setPaymentDraft(draft: Partial<PaymentDraftState>): void {
  Object.assign(paymentDraftStore, draft)
}

export function clearPaymentDraft(): void {
  resetStore(paymentDraftStore, defaults)
}
