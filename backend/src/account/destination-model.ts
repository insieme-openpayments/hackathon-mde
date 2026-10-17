import { BaseModel } from '@/lib'

export class SavedDestinationRow extends BaseModel {
  static tableName = 'savedDestinations'
  static jsonAttributes = ['details']

  public id!: string
  public userId!: string
  public kind!: 'efecty' | 'breb'
  public identity!: string
  public label!: string
  public details!: Record<string, unknown>
  public lastAmount!: number | null
  public lastUsedAt!: Date | null
}
