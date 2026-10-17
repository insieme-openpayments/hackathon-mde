import { Knex } from 'knex'
import { Logger } from 'winston'
import { Payment, PaymentStatus } from './model'
import { IOpenPayments } from '@/open-payments/service'
import { IncomingPayment } from '@interledger/open-payments'
import { TransactionOrKnex } from 'objection'
import { IOrderService } from '@/order/service'
import { ISettlementService } from '@/settlement/service'
import { InternalServerError } from '@/lib'

export type FailReason = 'rejected' | 'timeout'

export interface IPaymentService {
  get: (id: string) => Promise<Payment>
  fail: (
    payment: Payment,
    reason: FailReason,
    trx?: TransactionOrKnex
  ) => Promise<void>
  complete: (payment: Payment, trx?: TransactionOrKnex) => Promise<void>
  processPendingPayments: () => Promise<string | undefined>
}

export class PaymentService implements IPaymentService {
  private readonly TRESHOLD_MS: number = 5000
  private readonly MAX_ATTEMPTS: number = 360 // 30 min at 5 s: the incoming payment expiry

  constructor(
    private logger: Logger,
    private knex: Knex,
    private openPayments: IOpenPayments,
    private orderService: IOrderService,
    private settlementService: ISettlementService
  ) {}

  public async get(id: string) {
    const payment = await Payment.query().select().findById(id)
    if (!payment) {
      this.logger.error(`Payment "${id}" not found`)
      throw new InternalServerError()
    }
    return payment
  }

  public async complete(payment: Payment, trx?: TransactionOrKnex) {
    await Promise.all([
      this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, trx),
      this.orderService.complete(payment.orderId, trx),
      this.orderService.addEvent(
        payment.orderId,
        'Fondos recibidos en la billetera de recaudo (incoming payment completado)',
        trx
      )
    ])
    this.settleAfterCommit(payment.orderId, trx)
  }

  /** Settlement runs outside the transaction: only after it has committed. */
  private settleAfterCommit(orderId: string, trx?: TransactionOrKnex) {
    const run = () =>
      this.settlementService.settle({ id: orderId }).catch((err) => {
        this.logger.error(`Settlement of order ${orderId} failed`)
        this.logger.error(err)
      })
    const executionPromise = (
      trx as { executionPromise?: Promise<unknown> } | undefined
    )?.executionPromise
    if (executionPromise) {
      executionPromise.then(run, () => undefined)
    } else {
      void run()
    }
  }

  public async fail(
    payment: Payment,
    reason: FailReason,
    trx?: TransactionOrKnex
  ): Promise<void> {
    const rejected = reason === 'rejected'
    const promise = rejected
      ? this.orderService.reject(payment.orderId, trx)
      : this.orderService.fail(payment.orderId, trx)
    await this.orderService.addEvent(
      payment.orderId,
      rejected
        ? 'Pagador rechazó la autorización'
        : 'Tiempo de espera agotado; pago no recibido',
      trx
    )
    await Promise.all([
      this.updatePaymentStatus(payment.id, PaymentStatus.FAILED, trx),
      promise,
      payment.$query(trx).patch({ processAt: null })
    ])
  }

  private ensurePaymentIsCompleted(
    incomingPayment: IncomingPayment,
    orderTotal: number
  ): boolean {
    const { receivedAmount } = incomingPayment
    const convertedTotal = (
      orderTotal *
      10 ** incomingPayment.receivedAmount.assetScale
    ).toFixed()

    if (BigInt(convertedTotal) !== BigInt(receivedAmount.value)) {
      return false
    }

    return true
  }

  private async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    trx?: TransactionOrKnex
  ): Promise<Payment | undefined> {
    const payment = await Payment.query(trx).findById(id)
    if (!payment) return

    return await payment.$query(trx).patchAndFetch({ status })
  }

  public async processPendingPayments(): Promise<string | undefined> {
    return this.knex.transaction(async (trx) => {
      const now = new Date(Date.now()).toISOString()
      const [payment] = await Payment.query(trx)
        .limit(1)
        .forUpdate()
        .skipLocked()
        .where({ status: PaymentStatus.PENDING })
        .whereNotNull('processAt')
        .andWhere('processAt', '<=', now)
        .orderBy('processAt', 'asc')
        .withGraphFetched('order')

      if (!payment) return

      let incomingPayment: IncomingPayment | undefined
      try {
        incomingPayment = await this.openPayments.getIncomingPayment(
          payment.incomingPaymentUrl
        )
      } catch {
        // A payment that cannot be fetched must not block the queue: count
        // the attempt and move it to the back instead of rolling back.
        this.logger.warn(
          `Could not check incoming payment of order ${payment.orderId}; retrying later`
        )
        incomingPayment = undefined
      }

      if (
        incomingPayment &&
        this.ensurePaymentIsCompleted(incomingPayment, payment.order.total)
      ) {
        await Promise.all([
          this.complete(payment, trx),
          payment.$query(trx).patch({ processAt: null })
        ])
      } else if (payment.attempts >= this.MAX_ATTEMPTS) {
        await this.fail(payment, 'timeout', trx)
      } else {
        await payment.$query(trx).patch({
          attempts: payment.attempts + 1,
          processAt: new Date(Date.now() + this.TRESHOLD_MS)
        })
      }
      return payment.id
    })
  }
}
