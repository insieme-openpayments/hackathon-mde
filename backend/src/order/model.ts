import { OrderItem } from '@/order-item/model'
import { Payment } from '@/payment/model'
import { User } from '@/user/model'
import { Model, Pojo, TransactionOrKnex } from 'objection'
import { BaseModel } from '@/lib'
import { Settlement } from '@/settlement/model'

export enum OrderStatus {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED'
}

export interface OrderEvent {
  at: string
  message: string
}

export class Order extends BaseModel {
  static tableName = 'orders'
  static jsonAttributes = ['events']

  public id!: string
  public userId!: string
  public total!: number
  public status!: OrderStatus
  public orderItems!: OrderItem[]
  public payments!: Payment
  public settlement?: Settlement | null
  public events!: OrderEvent[]

  // GET /orders/:id is public (the confirmation page polls it by id): the
  // owner account id is not part of that response.
  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...safe } = json
    return safe
  }

  async calculateTotalAmount(trx: TransactionOrKnex): Promise<Order> {
    const { totalAmount } = (await OrderItem.query(trx)
      .where({
        orderId: this.id
      })
      .select(
        trx.raw(
          'TRUNC(ROUND(SUM(quantity * price)::numeric, 2), 2)::float as "totalAmount"'
        )
      )
      .first()) as unknown as { totalAmount: number }

    await this.$query(trx).patch({ total: totalAmount })
    return this
  }

  static relationMappings = () => ({
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'orders.userId',
        to: 'users.id'
      }
    },

    orderItems: {
      relation: Model.HasManyRelation,
      modelClass: OrderItem,
      join: {
        from: 'orders.id',
        to: 'orderItems.orderId'
      }
    },

    payments: {
      relation: Model.HasOneRelation,
      modelClass: Payment,
      join: {
        from: 'orders.id',
        to: 'payments.orderId'
      }
    },

    settlement: {
      relation: Model.HasOneRelation,
      modelClass: Settlement,
      join: {
        from: 'orders.id',
        to: 'settlements.orderId'
      }
    }
  })
}
