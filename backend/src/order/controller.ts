import { NextFunction, Request } from 'express'
import { IOrderService } from './service'
import { Order } from './model'
import {
  BadRequest,
  Unauthorized,
  Controller,
  InternalServerError,
  toSuccessResponse
} from '@/lib'
import { Logger } from 'winston'
import { IOpenPayments, TokenInfo } from '@/open-payments/service'
import { validate } from '@/middleware/validate'
import { IPaymentService } from '@/payment/service'
import { Knex } from 'knex'
import { OneClickCache } from '@/cache/one-click'
import {
  instantBuySchema,
  createOrderSchema,
  finishOrderSchema,
  setupFinishSchema,
  oneClickSetupSchema
} from '@insieme/shared'
import { OpenPaymentsClientError } from '@interledger/open-payments'
import type { OrderItemInput } from '@insieme/shared'
import { IBillService, type PricedOrderItem } from '@/bill/service'

interface GetParams {
  id?: string
}

interface CreateResponse {
  redirectUrl: string
}

interface CreateOrderResponse extends CreateResponse {
  orderId: string
}

interface InstantBuyResponse extends TokenInfo {
  walletAddressUrl: string
  orderId: string
}

export interface IOrderController {
  get: Controller<Order>
  create: Controller<CreateOrderResponse>
  finish: Controller
  setup: Controller<CreateResponse>
  setupFinish: Controller<TokenInfo>
  instantBuy: Controller<InstantBuyResponse>
}

export class OrderController implements IOrderController {
  constructor(
    private knex: Knex,
    private logger: Logger,
    private openPayments: IOpenPayments,
    private orderService: IOrderService,
    private paymentService: IPaymentService,
    private billService: IBillService,
    private oneClickCache: OneClickCache
  ) {}

  /** Prices every item server-side and persists the order with its total. */
  private async createPricedOrder(items: OrderItemInput[]): Promise<Order> {
    const orderItems: PricedOrderItem[] = []
    for (const item of items) {
      orderItems.push(await this.billService.priceOrderItem(item))
    }
    return await Order.transaction(async (trx) => {
      const newOrder = await this.orderService.create({ orderItems }, trx)
      return await newOrder.calculateTotalAmount(trx)
    })
  }

  get = async (
    req: Request<GetParams>,
    res: TypedResponse<Order>,
    next: NextFunction
  ) => {
    try {
      const { params } = req
      if (!params.id) {
        throw new BadRequest('Order ID was not provided.')
      }

      const order = await this.orderService.get(params.id)

      res.status(200).json(toSuccessResponse(order))
    } catch (err) {
      this.logger.error(err)
      next(err)
    }
  }

  create = async (
    req: Request,
    res: TypedResponse<CreateOrderResponse>,
    next: NextFunction
  ) => {
    try {
      const { products, walletAddressUrl } = await validate(
        createOrderSchema,
        req.body
      )

      const order = await this.createPricedOrder(products)

      const grant = await this.openPayments.preparePayment({
        order,
        walletAddressUrl
      })

      this.logger.debug(JSON.stringify(grant, null, 2))
      res.status(201).json(
        toSuccessResponse({
          redirectUrl: grant.interact.redirect,
          orderId: order.id
        })
      )
    } catch (err) {
      next(err)
    }
  }

  finish = async (req: Request, res: TypedResponse, next: NextFunction) => {
    try {
      const orderId = req.params.id
      if (!orderId) {
        throw new BadRequest('Order ID was not provided.')
      }

      const { interactRef, hash, result } = await validate(
        finishOrderSchema,
        req.body
      )

      const order = await this.orderService.ensurePendingState(orderId)

      if (result) {
        const isRejected = result === 'grant_rejected'
        const status = isRejected ? 200 : 400
        const message = isRejected ? 'SUCCESS' : 'FAILED'
        await this.knex.transaction(async (trx) => {
          await this.paymentService.fail(order.payments, trx)
        })
        res.status(status).json({ success: isRejected, message })
        return
      }

      await this.openPayments.verifyHash({
        interactRef,
        receivedHash: hash,
        clientNonce: order.payments.clientNonce,
        interactNonce: order.payments.interactNonce,
        walletAddressUrl: order.payments.walletAddress
      })
      await this.openPayments.createOutgoingPayment(order, interactRef)

      res.status(200).json({ success: true, message: 'SUCCESS' })
    } catch (err) {
      next(err)
    }
  }

  setup = async (
    req: Request,
    res: TypedResponse<CreateResponse>,
    next: NextFunction
  ) => {
    try {
      const { walletAddressUrl, amount } = await validate(
        oneClickSetupSchema,
        req.body
      )

      const redirectUrl = await this.openPayments.setupOneClick(
        walletAddressUrl,
        Number(amount)
      )
      res.status(200).json(toSuccessResponse({ redirectUrl }))
    } catch (err) {
      next(err)
    }
  }

  setupFinish = async (
    req: Request,
    res: TypedResponse<TokenInfo>,
    next: NextFunction
  ) => {
    try {
      const { interactRef, hash, identifier, result } = await validate(
        setupFinishSchema,
        req.body
      )

      const identifierData = await this.oneClickCache.get(identifier)

      if (!identifierData) {
        this.logger.error(
          `Could not find interaction data for identifier "${identifier}"`
        )
        throw new InternalServerError()
      }

      if (result) {
        const isRejected = result === 'grant_rejected'
        const status = isRejected ? 200 : 400
        const message = isRejected ? 'SUCCESS' : 'FAILED'
        res.status(status).json({ success: isRejected, message })
        return
      }

      await this.openPayments.verifyHash({
        interactRef,
        receivedHash: hash,
        clientNonce: identifierData.clientNonce,
        interactNonce: identifierData.interactNonce,
        walletAddressUrl: identifierData.walletAddressUrl
      })

      const tokenInfo = await this.openPayments.continueGrant({
        accessToken: identifierData.continueToken,
        url: identifierData.continueUri,
        interactRef
      })

      res.status(200).json(
        toSuccessResponse({
          ...tokenInfo,
          walletAddressUrl: identifierData.walletAddressUrl
        })
      )
    } catch (err) {
      next(err)
    }
  }

  instantBuy = async (
    req: Request,
    res: TypedResponse<InstantBuyResponse>,
    next: NextFunction
  ) => {
    let order: Order | undefined
    try {
      const args = await validate(instantBuySchema, req.body)

      order = await this.createPricedOrder(args.products)
      const tokenInfo = await this.openPayments.instantBuy({ order, ...args })

      res.status(200).json(
        toSuccessResponse({
          ...tokenInfo,
          walletAddressUrl: args.walletAddressUrl,
          orderId: order.id
        })
      )
    } catch (err) {
      if (
        order &&
        err instanceof OpenPaymentsClientError &&
        err.status === 401
      ) {
        next(
          new Unauthorized('Instant-buy is not valid please initiate it again')
        )
        const orderId = order.id
        await Order.transaction(async (trx) => {
          return await this.orderService.delete(orderId, trx)
        })
      } else next(err)
    }
  }
}
