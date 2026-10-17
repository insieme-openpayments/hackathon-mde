import { NextFunction, Request } from 'express'
import { IProductService } from './service'
import { Product } from './model'
import { Category } from '@/category/model'
import { BadRequest, Controller, toSuccessResponse } from '@/lib'
import { Logger } from 'winston'
import { validate } from '@/middleware/validate'
import { catalogQuerySchema } from '@insieme/shared'

interface GetParams {
  slug?: string
}

interface CatalogResponse {
  categories: Category[]
  products: Product[]
}

export interface IProductController {
  get: Controller<Product>
  list: Controller<Product[]>
  catalog: Controller<CatalogResponse>
}

export class ProductController implements IProductController {
  constructor(
    private productService: IProductService,
    private logger: Logger
  ) {}

  get = async (
    req: Request<GetParams>,
    res: TypedResponse<Product>,
    next: NextFunction
  ) => {
    try {
      const { params } = req
      if (!params.slug) {
        this.logger.error(
          'Attempting to fetch a product without the slug parameter provided.'
        )
        throw new BadRequest('Product slug was not provided.')
      }

      const product = await this.productService.getBySlug(params.slug)

      res.status(200).json(toSuccessResponse(product))
    } catch (err) {
      next(err)
    }
  }

  list = async (
    req: Request,
    res: TypedResponse<Product[]>,
    next: NextFunction
  ) => {
    try {
      const filters = await validate(catalogQuerySchema, req.query)
      const products = await this.productService.list(filters)
      res.status(200).json(toSuccessResponse(products))
    } catch (err) {
      this.logger.error(err)
      next(err)
    }
  }

  catalog = async (
    req: Request,
    res: TypedResponse<CatalogResponse>,
    next: NextFunction
  ) => {
    try {
      const { type } = await validate(catalogQuerySchema, req.query)
      const [categories, products] = await Promise.all([
        this.productService.listCategories(),
        this.productService.list({ type: type ?? 'servicio' })
      ])
      res.status(200).json(toSuccessResponse({ categories, products }))
    } catch (err) {
      this.logger.error(err)
      next(err)
    }
  }
}
