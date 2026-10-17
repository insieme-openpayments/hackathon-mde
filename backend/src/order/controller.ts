import { NextFunction, Request } from 'express'
import { IOrderService } from './service'
import { Order, type OrderEvent } from './model'
import { Payment, PaymentStatus } from '@/payment/model'
import type { ProviderAttempt } from '@/settlement/providers'
import type {
  InstantBuyAccountResponse,
  SetupFinishResponse,
  SettlementReceipt
} from '@insieme/shared'
import {
  BadRequest,
  Conflict,
  Unauthorized,
  Controller,
  InternalServerError,
  toSuccessResponse
} from '@/lib'
import { Logger } from 'winston'
import { IOpenPayments } from '@/open-payments/service'
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
import { IUserService } from '@/user/service'
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

export interface IOrderController {
  get: Controller<Order>
  create: Controller<CreateOrderResponse>
  finish: Controller
  setup: Controller<CreateResponse>
  setupFinish: Controller<SetupFinishResponse>
  instantBuy: Controller<InstantBuyAccountResponse>
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
    private oneClickCache: OneClickCache,
    private userService: IUserService
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
  private async createPricedOrder(
    items: OrderItemInput[],
    userId?: string
  ): Promise<Order> {
    const orderItems: PricedOrderItem[] = []
    for (const item of items) {
      orderItems.push(await this.billService.priceOrderItem(item))
    }
    return await Order.transaction(async (trx) => {
      const newOrder = await this.orderService.create(
        { orderItems, userId },
        trx
      )
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

      const order = await this.createPricedOrder(products, req.user?.id)

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
    res: TypedResponse<SetupFinishResponse>,
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

      const { walletAddressUrl } = identifierData
      if (req.user) {
        // Con sesión, el grant queda en la cuenta y no viaja al navegador.
        const previous = req.user.oneClickGrant
        if (previous && previous.accessToken !== tokenInfo.accessToken) {
          // Best-effort: no deja un token huérfano vivo en la billetera.
          await this.openPayments
            .revokeToken({
              accessToken: previous.accessToken,
              manageUrl: previous.manageUrl
            })
            .catch((e) => this.logger.error(e))
        }
        await this.userService.setGrant(req.user.id, {
          ...tokenInfo,
          walletAddressUrl,
          createdAt: new Date().toISOString()
        })
        res
          .status(200)
          .json(toSuccessResponse({ walletAddressUrl, storedInAccount: true }))
        return
      }

      res.status(200).json(
        toSuccessResponse({
          ...tokenInfo,
          walletAddressUrl,
          storedInAccount: false
        })
      )
    } catch (err) {
      next(err)
    }
  }

  instantBuy = async (
    req: Request,
    res: TypedResponse<InstantBuyAccountResponse>,
    next: NextFunction
  ) => {
    let order: Order | undefined
    // Token del grant guardado en la cuenta que se está usando (si aplica).
    let accountToken: string | undefined
    try {
      const args = await validate(instantBuySchema, req.body)
      const missingGrant = new BadRequest('Invalid input', {
        accessToken: 'Configura el pago en un clic antes de usarlo'
      })

      let accessToken = args.accessToken
      let manageUrl = args.manageUrl
      const useAccountGrant = !accessToken || !manageUrl
      if (useAccountGrant) {
        const grant = req.user?.oneClickGrant
        if (
          !req.user ||
          !grant ||
          grant.walletAddressUrl.replace(/\/+$/, '').toLowerCase() !==
            args.walletAddressUrl.replace(/\/+$/, '').toLowerCase()
        ) {
          throw missingGrant
        }
        accessToken = grant.accessToken
        manageUrl = grant.manageUrl
        accountToken = grant.accessToken
      }
      if (!accessToken || !manageUrl) throw missingGrant

      order = await this.createPricedOrder(args.products, req.user?.id)
      let tokenInfo
      try {
        tokenInfo = await this.openPayments.instantBuy({
          order,
          walletAddressUrl: args.walletAddressUrl,
          accessToken,
          manageUrl
        })
      } catch (err) {
        await this.abandonOrder(
          order.id,
          'No se pudo ejecutar el pago en un clic; orden cancelada'
        )
        throw err
      }

      if (useAccountGrant && req.user && accountToken) {
        // El token rota en cada pago: se persiste en la cuenta y no se devuelve.
        try {
          await this.userService.rotateGrant(req.user.id, accountToken, {
            ...tokenInfo,
            walletAddressUrl: args.walletAddressUrl,
            createdAt:
              req.user.oneClickGrant?.createdAt ?? new Date().toISOString()
          })
        } catch (persistErr) {
          this.logger.error('Could not persist the rotated account grant')
          this.logger.error(persistErr)
        }
        res.status(200).json(
          toSuccessResponse({
            walletAddressUrl: args.walletAddressUrl,
            orderId: order.id
          })
        )
        return
      }

      res.status(200).json(
        toSuccessResponse({
          ...tokenInfo,
          walletAddressUrl: args.walletAddressUrl,
          orderId: order.id
        })
      )
    } catch (err) {
      const status =
        err instanceof OpenPaymentsClientError ? err.status : undefined
      const isLimitExceeded =
        err instanceof BadRequest &&
        err.message.startsWith('One click buy spending limit exceeded')
      // Con grant de cuenta, un fallo del auth server o del límite deja el
      // token guardado inservible: se limpia para que la UI reconfigure.
      const accountGrantFailed =
        !!accountToken &&
        (isLimitExceeded ||
          (status !== undefined && [400, 401, 403, 404, 500].includes(status)))
      if (order && (status === 401 || accountGrantFailed)) {
        if (req.user && accountToken) {
          await this.userService
            .clearGrantIfToken(req.user.id, accountToken)
            .catch((e) => this.logger.error(e))
        }
        next(
          new Unauthorized('Instant-buy is not valid please initiate it again')
        )
      } else next(err)
    }
  }
}
