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
  constructor(public attempts: ProviderAttempt[]) {
    super('Ningún proveedor pudo ejecutar el pago')
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

export function candidates(category?: string | null): PaymentProvider[] {
  return providers
    .filter(
      (p) =>
        p.categories.includes(ALL) ||
        (!!category && p.categories.includes(category))
    )
    .sort((a, b) => a.priority - b.priority)
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
