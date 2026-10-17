import { HttpError, IntegrationUnavailable } from '@/integration/client'
import type { IIntegrationClient } from '@/integration/client'
import { integrationProviders } from './integration'
import {
  simulatedProvider,
  type PaymentProvider,
  type ProviderPayRequest,
  type ProviderReceipt
} from './base'

export interface ProviderAttempt {
  provider: string
  error: string
}

export class AllProvidersFailedError extends Error {
  constructor(
    public attempts: ProviderAttempt[],
    message = 'Ningún proveedor pudo ejecutar el pago'
  ) {
    super(message)
  }
}

const ALL = '*'

export const providers: PaymentProvider[] = [
  simulatedProvider({
    id: 'puntored',
    categories: [ALL],
    priority: 1,
    latencyMs: 700
  }),
  simulatedProvider({
    id: 'recaudo-b',
    categories: [ALL],
    priority: 2,
    latencyMs: 900
  }),
  simulatedProvider({
    id: 'breb',
    categories: ['administracion', 'educacion'],
    priority: 3,
    latencyMs: 500
  })
]

const simEfecty = simulatedProvider({
  id: 'efecty-sim',
  categories: [],
  priority: 1,
  latencyMs: 500,
  receipt: (_req, authCode) => ({
    reference: authCode,
    status: 'pending_claim',
    message: 'Giro disponible para reclamar',
    instructions: 'Presenta tu documento en cualquier punto Efecty.',
    network: 'Efecty'
  })
})

const simBreb = simulatedProvider({
  id: 'breb-sim',
  categories: [],
  priority: 1,
  latencyMs: 500,
  receipt: (req, authCode) => ({
    reference: authCode,
    status: 'completed',
    message: 'Transferencia enviada',
    holderName: String(req.details.holderName ?? ''),
    bank: String(req.details.bank ?? '')
  })
})

export function candidates(category?: string | null): PaymentProvider[] {
  return providers
    .filter(
      (p) =>
        p.categories.includes(ALL) ||
        (!!category && p.categories.includes(category))
    )
    .sort((a, b) => a.priority - b.priority)
}

const UNCONFIRMED =
  'No se pudo confirmar la operación; consulta el estado antes de reintentar'

/** User-facing reason for a failed upstream call. */
export function describeProviderError(e: unknown): string {
  if (e instanceof IntegrationUnavailable) return UNCONFIRMED
  if (e instanceof HttpError) return e.status === 504 ? UNCONFIRMED : e.detail
  return e instanceof Error ? e.message : String(e)
}

/**
 * Routes a payment. With an integration client the real provider for the
 * kind is used and NEVER fails over to simulated ones (it would fake a success
 * after a real rejection). Without a client the simulated chain runs.
 */
export class SettlementRouter {
  constructor(private client: IIntegrationClient | null) {}

  async pay(
    category: string | null | undefined,
    req: ProviderPayRequest
  ): Promise<{ receipt: ProviderReceipt; attempts: ProviderAttempt[] }> {
    const isNew = req.kind === 'efecty' || req.kind === 'breb'
    if (!this.client) {
      if (!isNew) return payInvoice(category, req)
      return payWith([req.kind === 'efecty' ? simEfecty : simBreb], req)
    }
    const real = integrationProviders(this.client)
    const provider =
      req.kind === 'efecty'
        ? real.efecty
        : req.kind === 'breb'
          ? real.breb
          : real.services
    return payWith([provider], req, true)
  }
}

async function payWith(
  list: PaymentProvider[],
  req: ProviderPayRequest,
  describe = false
): Promise<{ receipt: ProviderReceipt; attempts: ProviderAttempt[] }> {
  const attempts: ProviderAttempt[] = []
  for (const provider of list) {
    try {
      return { receipt: await provider.pay(req), attempts }
    } catch (e) {
      attempts.push({
        provider: provider.id,
        error: e instanceof Error ? e.message : String(e)
      })
      if (describe) {
        throw new AllProvidersFailedError(attempts, describeProviderError(e))
      }
    }
  }
  throw new AllProvidersFailedError(attempts)
}

/** Pays with failover. The same idempotencyKey is used for every attempt. */
export async function payInvoice(
  category: string | null | undefined,
  req: ProviderPayRequest
): Promise<{ receipt: ProviderReceipt; attempts: ProviderAttempt[] }> {
  const attempts: ProviderAttempt[] = []
  for (const provider of candidates(category)) {
    try {
      const receipt = await provider.pay(req)
      return { receipt, attempts }
    } catch (e) {
      attempts.push({
        provider: provider.id,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }
  throw new AllProvidersFailedError(attempts)
}
