import { Logger } from 'winston'
import { Order, OrderStatus } from '@/order/model'
import { IOrderService } from '@/order/service'
import type { SettlementReceipt } from '@insieme/shared'
import type { IIntegrationClient } from '@/integration/client'
import { Settlement, SettlementStatus } from './model'
import {
  AllProvidersFailedError,
  SettlementRouter,
  describeProviderError,
  type ProviderAttempt
} from './providers'

type Kind = 'servicio' | 'factura' | 'efecty' | 'breb'

const FINAL_EVENT: Record<Kind, string> = {
  servicio: 'Factura pagada en Colombia',
  factura: 'Factura pagada en Colombia',
  efecty: 'Giro disponible para reclamar en Efecty',
  breb: 'Transferencia Bre-B enviada'
}

export interface ISettlementService {
  settle: (order: Pick<Order, 'id'>) => Promise<Settlement | undefined>
  retryPending: () => Promise<void>
}

export class SettlementService implements ISettlementService {
  private inFlight = new Map<string, Promise<Settlement | undefined>>()

  private router: SettlementRouter

  constructor(
    private logger: Logger,
    private orderService: IOrderService,
    integrationClient: IIntegrationClient | null
  ) {
    this.router = new SettlementRouter(integrationClient ?? null)
  }

  /** Idempotent: concurrent calls share one promise; the DB key dedupes across restarts. */
  public settle(order: Pick<Order, 'id'>): Promise<Settlement | undefined> {
    const running = this.inFlight.get(order.id)
    if (running) return running
    const promise = this.doSettle(order.id).finally(() =>
      this.inFlight.delete(order.id)
    )
    this.inFlight.set(order.id, promise)
    return promise
  }

  public async retryPending(): Promise<void> {
    const pending = await Order.query()
      .where({ status: OrderStatus.COMPLETED })
      .whereNotExists(
        Settlement.query().whereColumn('settlements.orderId', 'orders.id')
      )
    for (const order of pending) {
      try {
        await this.settle(order)
      } catch (err) {
        this.logger.error(`Retry settlement failed for order ${order.id}`)
        this.logger.error(err)
      }
    }
  }

  private async doSettle(orderId: string): Promise<Settlement | undefined> {
    const order = await Order.query()
      .findById(orderId)
      .withGraphFetched('[orderItems.product, payments, settlement]')
    if (!order) return
    if (order.settlement) return order.settlement
    if (order.status !== OrderStatus.COMPLETED) return
    if (!order.payments) {
      this.logger.error(`Order ${orderId} has no payment to settle`)
      return
    }

    const item = order.orderItems[0]
    const idempotencyKey = order.payments.incomingPaymentUrl

    const details = (item?.details ?? {}) as unknown as Record<string, unknown>
    const kind = ((details.kind as Kind | undefined) ?? 'servicio') as Kind
    // Efecty charges amount + fee to the payer but sends only the amount.
    const fee = kind === 'efecty' ? Number(details.fee ?? 0) : 0

    try {
      const { receipt, attempts } = await this.router.pay(
        item?.product?.category,
        {
          convenio: item?.product?.name ?? '',
          ref1: String(details.ref1 ?? ''),
          amount: order.total - fee,
          idempotencyKey,
          kind,
          slug: item?.product?.slug ?? '',
          details
        }
      )
      return await this.record(order, idempotencyKey, kind, {
        status: SettlementStatus.SETTLED,
        provider: receipt.provider,
        authCode: receipt.authCode,
        amount: order.total,
        paidAt: new Date(receipt.paidAt),
        attempts,
        receipt: receipt.receipt ?? null
      })
    } catch (err) {
      const attempts =
        err instanceof AllProvidersFailedError ? err.attempts : []
      const message =
        err instanceof AllProvidersFailedError
          ? err.message
          : describeProviderError(err)
      this.logger.error(`Settlement failed for order ${orderId}: ${message}`)
      return await this.record(order, idempotencyKey, kind, {
        status: SettlementStatus.FAILED,
        attempts,
        message
      })
    }
  }

  private async record(
    order: Order,
    idempotencyKey: string,
    kind: Kind,
    data: {
      status: SettlementStatus
      attempts: ProviderAttempt[]
      provider?: string
      authCode?: string
      amount?: number
      paidAt?: Date
      message?: string
      receipt?: SettlementReceipt | null
    }
  ): Promise<Settlement | undefined> {
    const { message, ...columns } = data
    const ok = data.status === SettlementStatus.SETTLED
    try {
      return await Order.transaction(async (trx) => {
        const settlement = await Settlement.query(trx).insert({
          ...columns,
          orderId: order.id,
          idempotencyKey
        })
        // Public timeline: never name the provider (it stays in attempts,
        // visible only through GET /admin/orders).
        // (the last failed attempt of a failed settlement had no retry after it)
        const retries = data.attempts.length - (ok ? 0 : 1)
        for (let i = 0; i < retries; i++) {
          await this.orderService.addEvent(
            order.id,
            'Red de recaudo no disponible; reintentando con otra red',
            trx
          )
        }
        await this.orderService.addEvent(
          order.id,
          ok
            ? data.receipt?.status === 'pending' &&
              (kind === 'servicio' || kind === 'factura')
              ? 'Pago en proceso en la red de recaudo'
              : FINAL_EVENT[kind]
            : `Error de liquidación: ${message}`,
          trx
        )
        await Order.query(trx)
          .findById(order.id)
          .patch({
            status: ok ? OrderStatus.SETTLED : OrderStatus.SETTLEMENT_FAILED
          })
        return settlement
      })
    } catch (err) {
      // Unique violation: another process already settled this order
      const existing = await Settlement.query().findOne({ idempotencyKey })
      if (existing) return existing
      throw err
    }
  }
}
