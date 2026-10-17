import { NextFunction, Request } from 'express'
import { IOrderService } from './service'
import { Order, type OrderEvent } from './model'
import { Payment, PaymentStatus } from '@/payment/model'
import type { ProviderAttempt } from '@/settlement/providers'
import type { SettlementReceipt } from '@insieme/shared'
import {
  BadRequest,
  Conflict,
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
import { z } from 'zod'
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

export interface AdminOrder {
  id: string
  status: string
  settlement: {
    provider: string | null
    authCode: string | null
    attempts: ProviderAttempt[]
    receipt: SettlementReceipt | null
  } | null
  events: OrderEvent[]
}

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
  admin: Controller<AdminOrder[]>
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

  /**
   * Cleans up an order whose payment could not be prepared: deletes it when no
   * payment row exists, otherwise marks it FAILED.
   */
  private async abandonOrder(orderId: string, reason: string): Promise<void> {
    try {
      await Order.transaction(async (trx) => {
        const payment = await Payment.query(trx).findOne({ orderId })
        if (payment) {
          await this.orderService.fail(orderId, trx)
          await this.orderService.addEvent(orderId, reason, trx)
          // Stop the poller from chasing a payment of an abandoned order.
          await Payment.query(trx)
            .patch({ status: PaymentStatus.FAILED, processAt: null })
            .where({ id: payment.id })
        } else {
          await this.orderService.delete(orderId, trx)
        }
      })
    } catch (cleanupErr) {
      this.logger.error(`Could not clean up order ${orderId}`)
      this.logger.error(cleanupErr)
    }
  }

  /** Prices every item server-side and persists the order with its total. */
  private async createPricedOrder(items: OrderItemInput[]): Promise<Order> {
    const orderItems: PricedOrderItem[] = []
    for (const item of items) {
      orderItems.push(await this.billService.priceOrderItem(item))
    }
    return await Order.transaction(async (trx) => {
      const newOrder = await this.orderService.create({ orderItems }, trx)
      await this.orderService.addEvent(
        newOrder.id,
        'Cobro creado; esperando autorización del pagador',
        trx
      )
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
      // A failed settlement attempt has no receipt: expose null, not empty fields.
      if (order.settlement && order.settlement.status !== 'SETTLED') {
        order.settlement = null
      }

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

      let grant
      try {
        grant = await this.openPayments.preparePayment({
          order,
          walletAddressUrl
        })
      } catch (err) {
        await this.abandonOrder(
          order.id,
          'No se pudo preparar el pago; orden cancelada'
        )
        throw err
      }

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
      if (!orderId || !z.string().uuid().safeParse(orderId).success) {
        throw new BadRequest('Order ID is not valid.')
      }

      const { interactRef, hash, result } = await validate(
        finishOrderSchema,
        req.body
      )

      const order = await this.orderService.ensurePendingState(orderId)

      if (order.payments.authorizedAt) {
        if (result) {
          throw new Conflict('Order was already authorized.')
        }
        // Replayed callback: already consumed, nothing else to do.
        res.status(200).json({ success: true, message: 'SUCCESS' })
        return
      }

      if (result) {
        const isRejected = result === 'grant_rejected'
        const status = isRejected ? 200 : 400
        const message = isRejected ? 'SUCCESS' : 'FAILED'
        await this.knex.transaction(async (trx) => {
          // Claim the payment so concurrent or replayed callbacks are no-ops.
          const claimed = await Payment.query(trx)
            .patch({ status: PaymentStatus.FAILED, processAt: null })
            .where({ id: order.payments.id, status: PaymentStatus.PENDING })
          if (claimed === 0) return
          await this.paymentService.fail(order.payments, 'rejected', trx)
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

      // Atomically claim the callback so a concurrent replay is a no-op.
      const claimed = await Payment.query()
        .patch({ authorizedAt: new Date() })
        .where({ id: order.payments.id })
        .whereNull('authorizedAt')
      if (claimed === 0) {
        res.status(200).json({ success: true, message: 'SUCCESS' })
        return
      }
      try {
        await this.openPayments.createOutgoingPayment(order, interactRef)
      } catch (err) {
        await Payment.query()
          .patch({ authorizedAt: null })
          .where({ id: order.payments.id })
        throw err
      }
      await this.orderService.addEvent(
        orderId,
        'Pagador autorizó; ejecutando pago saliente'
      )

      res.status(200).json({ success: true, message: 'SUCCESS' })
    } catch (err) {
      next(err)
    }
  }

  /** Internal, unauthenticated view of settlements (provider, attempts, events). */
  admin = async (
    _req: Request,
    res: TypedResponse<AdminOrder[]>,
    next: NextFunction
  ) => {
    try {
      const orders = await Order.query()
        .withGraphFetched('settlement')
        .orderBy('createdAt', 'desc')
        .limit(100)
      const result: AdminOrder[] = orders.reverse().map((o) => ({
        id: o.id,
        status: o.status,
        settlement: o.settlement
          ? {
              provider: o.settlement.provider,
              authCode: o.settlement.authCode,
              attempts: o.settlement.attempts,
              receipt: o.settlement.receipt ?? null
            }
          : null,
        events: o.events
      }))
      res.status(200).json(toSuccessResponse(result))
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
      let tokenInfo
      try {
        tokenInfo = await this.openPayments.instantBuy({ order, ...args })
      } catch (err) {
        await this.abandonOrder(
          order.id,
          'No se pudo ejecutar el pago en un clic; orden cancelada'
        )
        throw err
      }

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
      } else next(err)
    }
  }
}
