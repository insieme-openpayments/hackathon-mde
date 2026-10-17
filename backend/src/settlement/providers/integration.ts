import type { SettlementReceipt } from '@insieme/shared'
import type { IIntegrationClient } from '@/integration/client'
import type {
  PaymentProvider,
  ProviderPayRequest,
  ProviderReceipt
} from './base'

const str = (v: unknown): string => (v == null ? '' : String(v))

function receiptOf(
  provider: string,
  req: ProviderPayRequest,
  authCode: string,
  receipt: SettlementReceipt
): ProviderReceipt {
  return {
    provider,
    authCode,
    idempotencyKey: req.idempotencyKey,
    convenio: req.convenio,
    ref1: req.ref1,
    amount: req.amount,
    paidAt: new Date().toISOString(),
    status: receipt.status,
    receipt
  }
}

/** Real adapters over integration-backend. They never fall back to simulated ones. */
export function integrationProviders(client: IIntegrationClient): {
  services: PaymentProvider
  efecty: PaymentProvider
  breb: PaymentProvider
} {
  const services: PaymentProvider = {
    id: 'integration-services',
    categories: ['*'],
    priority: 1,
    async pay(req) {
      const trace = req.details.trace
      const res = await client.payService({
        trace: typeof trace === 'string' && trace ? trace : null,
        company_id: req.slug,
        reference: req.ref1,
        amount: req.amount,
        client_ip: null
      })
      if (res.status === 'rejected') {
        throw new Error(res.message || 'Pago rechazado por la red de recaudo')
      }
      const reference = str(res.transaction_id)
      return receiptOf(services.id, req, res.authorization_code || reference, {
        reference,
        status: res.status,
        ...(res.message ? { message: res.message } : {})
      })
    }
  }

  const efecty: PaymentProvider = {
    id: 'efecty',
    categories: [],
    priority: 1,
    async pay(req) {
      const d = req.details
      const res = await client.efectySend({
        recipient_document: str(d.recipientDocument),
        recipient_name: str(d.recipientName),
        recipient_phone: d.recipientPhone ? str(d.recipientPhone) : null,
        amount: req.amount
      })
      return receiptOf(efecty.id, req, res.transfer_id, {
        reference: res.transfer_id,
        status: res.status,
        message: res.message,
        instructions: res.claim?.instructions,
        expiresAt: res.expires_at,
        network: res.claim?.network
      })
    }
  }

  const breb: PaymentProvider = {
    id: 'breb',
    categories: [],
    priority: 1,
    async pay(req) {
      const d = req.details
      const res = await client.brebSend({
        key: str(d.key),
        amount: req.amount,
        description: d.description ? str(d.description) : null
      })
      return receiptOf(breb.id, req, res.transfer_id, {
        reference: res.transfer_id,
        status: res.status,
        message: res.message,
        holderName: res.holder_name,
        bank: res.bank
      })
    }
  }

  return { services, efecty, breb }
}
