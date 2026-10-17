import { BaseModel } from '@/lib'

export class Category extends BaseModel {
  static tableName = 'categories'

  public id!: string
  public label!: string
  public icon!: string | null
  public sortOrder!: number
}
