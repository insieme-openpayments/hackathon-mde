import { BaseModel } from '@/lib'

export class SavedBill extends BaseModel {
  static tableName = 'savedBills'

  public id!: string
  public userId!: string
  public productId!: string
  public name!: string
  public ref1!: string
  public ref2!: string | null
  public lastAmount!: number | null
  public lastPaidAt!: Date | null
}
