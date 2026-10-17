import { Order } from '@/order/model'
import { Product } from '@/product/model'
import { Model, QueryContext } from 'objection'
import { BaseModel, NotFound } from '@/lib'
import type { OrderReceiptItem } from '@insieme/shared'

export class OrderItem extends BaseModel {
  static tableName = 'orderItems'
  static jsonAttributes = ['details']

  public id!: string
  public orderId!: string
  public productId!: string
  public quantity!: number
  public price!: number
  public details!: OrderReceiptItem['details']
  public product?: Product

  public async $beforeInsert(ctx: QueryContext): Promise<void> {
    super.$beforeInsert(ctx)
    if (this.price == null) {
      const product = await Product.query(ctx.transaction)
        .findById(this.productId)
        .select('price')
      if (!product) throw new NotFound('Product not found')
      this.price = product.price
    }
  }

  static relationMappings = () => ({
    order: {
      relation: Model.BelongsToOneRelation,
      modelClass: Order,
      join: {
        from: 'orderItems.orderId',
        to: 'orders.id'
      }
    },

    product: {
      relation: Model.BelongsToOneRelation,
      modelClass: Product,
      join: {
        from: 'orderItems.productId',
        to: 'products.id'
      }
    }
  })
}
