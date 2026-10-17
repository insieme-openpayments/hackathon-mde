import { InMemoryCache } from '@/lib'

export type BillSnapshot = {
  amount: number
  partial: boolean
  minAmount: number
  maxAmount: number
  dueDate: string | null
  /** Only the local simulation invents these; a real upstream bill has none. */
  holder: string | null
  concept: string | null
  /** Where the amount came from. */
  source?: 'integration-backend' | 'local'
  /** Upstream validate trace, needed to pay (PuntoRed) */
  trace?: string | null
  /** Upstream says the payer must type the amount */
  requiresAmount?: boolean
}

export type BillSnapshotCache = InMemoryCache<BillSnapshot>
