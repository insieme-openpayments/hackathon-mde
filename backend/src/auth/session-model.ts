import { Model } from 'objection'

export class Session extends Model {
  static tableName = 'sessions'

  public id!: string
  public userId!: string
  public tokenHash!: string
  public expiresAt!: Date
  public createdAt!: Date
}
