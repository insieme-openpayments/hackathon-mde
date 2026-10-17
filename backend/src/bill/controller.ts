import { NextFunction, Request } from 'express'
import { Logger } from 'winston'
import type { BillLookupResult } from '@insieme/shared'
import { billLookupSchema } from '@insieme/shared'
import { Controller, toSuccessResponse } from '@/lib'
import { validate } from '@/middleware/validate'
import { IBillService } from './service'

export interface IBillController {
  lookup: Controller<BillLookupResult>
}

export class BillController implements IBillController {
  constructor(
    private billService: IBillService,
    private logger: Logger
  ) {}

  lookup = async (
    req: Request,
    res: TypedResponse<BillLookupResult>,
    next: NextFunction
  ) => {
    try {
      const { productId, ref1 } = await validate(billLookupSchema, req.body)
      const result = await this.billService.lookup(productId, ref1)
      res.status(200).json(toSuccessResponse(result))
    } catch (err) {
      this.logger.debug(err)
      next(err)
    }
  }
}
