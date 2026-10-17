import { Logger } from 'winston'
import { Product } from './model'
import { Category } from '@/category/model'
import { NotFound } from '@/lib'

type GetColumns = 'id' | 'slug'

export interface ListFilters {
  type?: string
  category?: string
}

export interface IProductService {
  getById: (id: string) => Promise<Product>
  getBySlug: (slug: string) => Promise<Product>
  list: (filters?: ListFilters) => Promise<Product[]>
  listCategories: () => Promise<Category[]>
}

export class ProductService implements IProductService {
  constructor(private logger: Logger) {}

  public async getById(id: string): Promise<Product> {
    const product = await this.get('id', id)
    if (!product) {
      this.logger.error(`Product with ID "${id}" was not found.`)
      throw new NotFound('Product was not found.')
    }
    return product
  }

  public async getBySlug(slug: string): Promise<Product> {
    const product = await this.get('slug', slug)
    if (!product) {
      this.logger.error(`Product with slug "${slug}" was not found.`)
      throw new NotFound('Product was not found.')
    }
    return product
  }

  public async list(filters: ListFilters = {}): Promise<Product[]> {
    const query = Product.query().orderBy([
      { column: 'sortOrder', order: 'asc' },
      { column: 'name', order: 'asc' }
    ])
    // Products the upstream catalog dropped are hidden (rows are never deleted)
    query.whereRaw("(metadata->>'active') is distinct from 'false'")
    if (filters.type) query.where('type', filters.type)
    if (filters.category) query.where('category', filters.category)
    return await query
  }

  public async listCategories(): Promise<Category[]> {
    return await Category.query().orderBy('sortOrder', 'asc')
  }

  private async get(
    column: GetColumns,
    value: string
  ): Promise<Product | undefined> {
    return await Product.query().where(column, '=', value).first()
  }
}
