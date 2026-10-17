import { randomBytes } from 'crypto'
import type { OrderItemKind, SettlementReceipt } from '@insieme/shared'

export interface ProviderPayRequest {
  convenio: string
  ref1: string
  /** Amount to move through the network (for efecty: without the fee). */
  amount: number
  idempotencyKey: string
  kind: OrderItemKind
  slug: string
  /** The order item's details object, as stored. */
  details: Record<string, unknown>
}

export interface ProviderReceipt {
  provider: string
  authCode: string
  idempotencyKey: string
  convenio: string
  ref1: string
  amount: number
  paidAt: string
  status?: string
  receipt?: SettlementReceipt
}

/** Contract for any collection network in Colombia. The frontend never sees which one ran. */
export interface PaymentProvider {
  id: string
  categories: string[]
  priority: number
  pay: (req: ProviderPayRequest) => Promise<ProviderReceipt>
}

interface SimulatedProviderOptions {
  id: string
  categories: string[]
  priority: number
  latencyMs?: number
  receipt?: (req: ProviderPayRequest, authCode: string) => SettlementReceipt
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Simulated adapter: latency, dedupe by idempotencyKey and forced failure via SIM_FAIL_PROVIDER. */
export function simulatedProvider({
  id,
  categories,
  priority,
  latencyMs = 600,
  receipt: buildReceipt
}: SimulatedProviderOptions): PaymentProvider {
  const seen = new Map<string, ProviderReceipt>()
  return {
    id,
    categories,
    priority,
    async pay(req) {
      // Read at call time so the failure can be toggled without restarting
      const failing = (process.env.SIM_FAIL_PROVIDER ?? '')
        .split(',')
        .map((s) => s.trim())
      const latency = process.env.NODE_ENV === 'test' ? 0 : latencyMs
      if (latency) await sleep(latency)
      if (failing.includes(id)) {
        throw new Error(`[sim] ${id} no disponible`)
      }
      const previous = seen.get(req.idempotencyKey)
      if (previous) return previous
      const authCode = randomBytes(4).toString('hex').toUpperCase()
      const receipt: ProviderReceipt = {
        provider: id,
        authCode,
        status: 'approved',
        receipt: buildReceipt?.(req, authCode),
        idempotencyKey: req.idempotencyKey,
        convenio: req.convenio,
        ref1: req.ref1,
        amount: req.amount,
        paidAt: new Date().toISOString()
      }
      seen.set(req.idempotencyKey, receipt)
      return receipt
    }
  }
}
