import { NextFunction, Request } from 'express'
import { Logger } from 'winston'
import type { BrebKeyResolution, EfectyQuote } from '@insieme/shared'
import { brebResolveSchema, efectyQuoteSchema } from '@insieme/shared'
import { Controller, toSuccessResponse } from '@/lib'
import { validate } from '@/middleware/validate'
import { IMoneyService } from './service'

export interface IMoneyController {
  quote: Controller<EfectyQuote>
  resolve: Controller<BrebKeyResolution>
}

export class MoneyController implements IMoneyController {
  constructor(
    private moneyService: IMoneyService,
    private logger: Logger
  ) {}

  quote = async (
    req: Request,
    res: TypedResponse<EfectyQuote>,
    next: NextFunction
  ) => {
    try {
      const input = await validate(efectyQuoteSchema, req.body)
      res
        .status(200)
        .json(toSuccessResponse(await this.moneyService.quoteEfecty(input)))
    } catch (err) {
      this.logger.debug(err)
      next(err)
    }
  }

  resolve = async (
    req: Request,
    res: TypedResponse<BrebKeyResolution>,
    next: NextFunction
  ) => {
    try {
      const { key } = await validate(brebResolveSchema, req.body)
      res
        .status(200)
        .json(toSuccessResponse(await this.moneyService.resolveBreb(key)))
    } catch (err) {
      this.logger.debug(err)
      next(err)
    }
  }
}
