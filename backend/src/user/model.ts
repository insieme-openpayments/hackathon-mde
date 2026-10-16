import { Order } from '@/order/model'
import { Model } from 'objection'
import { BaseModel } from '@/lib'

export class User extends BaseModel {
  static tableName = 'users'

  public id!: string
  public walletAddress!: string
  public token!: string

  static relationMappings = () => ({
    orders: {
      relation: Model.HasManyRelation,
      modelClass: Order,
      join: {
        from: 'users.id',
        to: 'orders.userId'
      }
    }
  })
}
