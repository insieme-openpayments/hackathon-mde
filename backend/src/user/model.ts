import { Order } from '@/order/model'
import { Model, type Pojo } from 'objection'
import { BaseModel } from '@/lib'

export interface OneClickGrant {
  accessToken: string
  manageUrl: string
  walletAddressUrl: string
  createdAt: string
}

export class User extends BaseModel {
  static tableName = 'users'
  static jsonAttributes = ['oneClickGrant']

  public id!: string
  public walletAddress!: string | null
  public token!: string
  public name!: string | null
  public document!: string | null
  public email!: string | null
  public phone!: string | null
  public passwordHash!: string | null
  public oneClickGrant!: OneClickGrant | null

  /** Never serialize secrets or the Open Payments grant. */
  $formatJson(json: Pojo): Pojo {
    json = super.$formatJson(json)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, oneClickGrant, walletAddress, ...safe } = json
    return safe
  }

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
