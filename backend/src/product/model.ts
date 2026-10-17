import { OrderItem } from '@/order-item/model'
import { Model, type Pojo } from 'objection'
import { BaseModel } from '@/lib'

export class Product extends BaseModel {
  static tableName = 'products'
  static jsonAttributes = ['metadata']

  public id!: string
  public name!: string
  public description!: string | null
  public slug!: string
  public price!: number
  public image!: string | null
  public imageDark!: string | null
  public type!: string
  public category!: string | null
  public requiresManualAmount!: boolean
  public minAmount!: number | null
  public maxAmount!: number | null
  public fixedAmount!: number | null
  public logo!: string | null
  public sortOrder!: number
  public metadata!: Record<string, unknown> | null

  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json)
    return { ...json, convenio: json.slug }
  }

  static relationMappings = () => ({
    orders: {
      relation: Model.HasManyRelation,
      modelClass: OrderItem,
      join: {
        from: 'products.id',
        to: 'orderItems.productId'
      }
    }
  })
}
