import { InMemoryCache } from '@/lib'

export type BillSnapshot = {
  amount: number
  partial: boolean
  minAmount: number
  maxAmount: number
  dueDate: string | null
  holder: string
  concept: string
}

export type BillSnapshotCache = InMemoryCache<BillSnapshot>
