import { Logger } from 'winston'
import { Order, OrderStatus } from '@/order/model'
import { IOrderService } from '@/order/service'
import { Settlement, SettlementStatus } from './model'
import {
  AllProvidersFailedError,
  payInvoice,
  type ProviderAttempt
} from './providers'

export interface ISettlementService {
  settle: (order: Pick<Order, 'id'>) => Promise<Settlement | undefined>
  retryPending: () => Promise<void>
}

export class SettlementService implements ISettlementService {
  private inFlight = new Map<string, Promise<Settlement | undefined>>()

  constructor(
    private logger: Logger,
    private orderService: IOrderService
  ) {}

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

    try {
      const { receipt, attempts } = await payInvoice(item?.product?.category, {
        convenio: item?.product?.name ?? '',
        ref1: String(item?.details?.ref1 ?? ''),
        amount: order.total,
        idempotencyKey
      })
      return await this.record(order, idempotencyKey, {
        status: SettlementStatus.SETTLED,
        provider: receipt.provider,
        authCode: receipt.authCode,
        amount: order.total,
        paidAt: new Date(receipt.paidAt),
        attempts
      })
    } catch (err) {
      const attempts =
        err instanceof AllProvidersFailedError ? err.attempts : []
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Settlement failed for order ${orderId}: ${message}`)
      return await this.record(order, idempotencyKey, {
        status: SettlementStatus.FAILED,
        attempts,
        message
      })
    }
  }

  private async record(
    order: Order,
    idempotencyKey: string,
    data: {
      status: SettlementStatus
      attempts: ProviderAttempt[]
      provider?: string
      authCode?: string
      amount?: number
      paidAt?: Date
      message?: string
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
        for (const a of data.attempts) {
          await this.orderService.addEvent(
            order.id,
            `Failover: ${a.provider} falló (${a.error})`,
            trx
          )
        }
        await this.orderService.addEvent(
          order.id,
          ok
            ? 'Factura pagada en Colombia'
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
