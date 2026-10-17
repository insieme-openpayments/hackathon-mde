import { type OrderItem } from '@/order-item/model'
import { Order, OrderStatus } from './model'
import { TransactionOrKnex } from 'objection'
import { Logger } from 'winston'
import { BadRequest, Conflict, NotFound } from '@/lib'
import { z } from 'zod'

type OrderItemParams = Pick<OrderItem, 'productId' | 'quantity'> &
  Partial<Pick<OrderItem, 'price' | 'details'>>

const PUBLIC_PAYMENT_COLUMNS = [
  'id',
  'status',
  'quoteId',
  'incomingPaymentUrl',
  'createdAt',
  'updatedAt'
]

interface CreateParams {
  userId?: string
  orderItems: OrderItemParams[]
}

export interface IOrderService {
  create: (params: CreateParams, trx: TransactionOrKnex) => Promise<Order>
  delete: (id: string, trx: TransactionOrKnex) => Promise<Order | undefined>
  get: (id: string, userId?: string) => Promise<Order>
  ensurePendingState: (id: string) => Promise<Order>
  list: (userId: string) => Promise<Order[]>
  complete: (id: string, trx?: TransactionOrKnex) => Promise<Order | undefined>
  reject: (id: string, trx?: TransactionOrKnex) => Promise<Order | undefined>
  fail: (id: string, trx?: TransactionOrKnex) => Promise<Order | undefined>
  addEvent: (
    id: string,
    message: string,
    trx?: TransactionOrKnex
  ) => Promise<void>
}

export class OrderService implements IOrderService {
  constructor(private logger: Logger) {}

  public async create(
    params: CreateParams,
    trx: TransactionOrKnex
  ): Promise<Order> {
    return await Order.query(trx)
      .insertGraph({
        ...params
      })
      .returning('*')
  }

  public async delete(
    id: string,
    trx: TransactionOrKnex
  ): Promise<Order | undefined> {
    return Order.query(trx).deleteById(id).returning('*').first()
  }

  public async get(id: string, userId?: string): Promise<Order> {
    if (!z.string().uuid().safeParse(id).success) {
      throw new NotFound('Order was not found.')
    }
    const row = Order.query()
      .findById(id)
      .withGraphFetched(
        '[orderItems.product, payments(publicColumns), settlement]'
      )
      .modifiers({
        publicColumns: (builder) => {
          builder.select(PUBLIC_PAYMENT_COLUMNS)
        }
      })
    if (userId) row.where('userId', '=', userId)

    const order = await row

    if (!order) {
      throw new NotFound('Order was not found.')
    }
    return order
  }

  public async ensurePendingState(id: string): Promise<Order> {
    const order = await this.get(id)
    if (order.status !== 'PROCESSING') {
      this.logger.warn(
        `Trying to perform a checkout confirmation on a non-pending order (ID: ${id}).`
      )
      throw new Conflict('Order is not pending.')
    }
    const withPayments = await order.$query().withGraphFetched('payments')
    if (!withPayments.payments) {
      throw new BadRequest('Order has no payment in progress.')
    }
    return withPayments
  }

  public async list(userId: string): Promise<Order[]> {
    return await Order.query().where('userId', '=', userId)
  }

  public async complete(
    id: string,
    trx?: TransactionOrKnex
  ): Promise<Order | undefined> {
    return await this.updateOrderStatus(id, OrderStatus.COMPLETED, trx)
  }

  public async reject(
    id: string,
    trx?: TransactionOrKnex
  ): Promise<Order | undefined> {
    return await this.updateOrderStatus(id, OrderStatus.REJECTED, trx)
  }

  public async fail(
    id: string,
    trx?: TransactionOrKnex
  ): Promise<Order | undefined> {
    return await this.updateOrderStatus(id, OrderStatus.FAILED, trx)
  }

  /** Appends {at, message} to orders.events atomically (safe under concurrency). */
  public async addEvent(
    id: string,
    message: string,
    trx?: TransactionOrKnex
  ): Promise<void> {
    const db = trx ?? Order.knex()
    const event = { at: new Date().toISOString(), message }
    await db('orders')
      .where({ id })
      .update({
        events: db.raw(`COALESCE("events", '[]'::jsonb) || ?::jsonb`, [
          JSON.stringify([event])
        ])
      })
  }

  private async updateOrderStatus(
    id: string,
    status: OrderStatus,
    trx?: TransactionOrKnex
  ): Promise<Order | undefined> {
    const order = await Order.query(trx).findById(id)
    if (!order) return

    return await order.$query(trx).patchAndFetch({ status })
  }
}
