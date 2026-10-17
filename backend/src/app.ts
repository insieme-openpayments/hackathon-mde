import { AwilixContainer } from 'awilix'
import cors from 'cors'
import express, {
  type Express,
  type NextFunction,
  type Request,
  Router
} from 'express'
import helmet from 'helmet'
import type { Server } from 'http'
import type { Cradle } from './container'
import { Model } from 'objection'
import {
  BadRequest,
  PayloadTooLarge,
  initErrorHandler,
  toSuccessResponse
} from '@/lib'
import path from 'path'
import { optionalAuth, requireAuth } from '@/middleware/auth'

export class App {
  private server!: Server

  constructor(private container: AwilixContainer<Cradle>) {}

  public async startServer(): Promise<void> {
    const express = await this.init()
    const env = this.container.resolve('env')
    const logger = this.container.resolve('logger')
    const knex = this.container.resolve('knex')

    await knex.migrate.latest({
      directory: __dirname + '/../migrations'
    })

    Model.knex(knex)

    this.container.resolve('catalogSyncService').start()

    this.server = express.listen(env.PORT)
    logger.info(`Insieme server started on port ${env.PORT}`)
  }

  public stop = async (): Promise<void> => {
    this.server.close()
  }

  public getPort(): number {
    const address = this.server.address()
    if (address && !(typeof address === 'string')) {
      return address.port
    }
    return 0
  }

  private async init(): Promise<Express> {
    const app = express()
    const router = Router()

    const env = this.container.resolve('env')
    const logger = this.container.resolve('logger')
    const productController = this.container.resolve('productController')
    const orderController = this.container.resolve('orderController')
    const billController = this.container.resolve('billController')
    const moneyController = this.container.resolve('moneyController')
    const authService = this.container.resolve('authService')
    const authController = this.container.resolve('authController')
    const meController = this.container.resolve('meController')
    const savedBillController = this.container.resolve('savedBillController')
    const savedDestinationController = this.container.resolve(
      'savedDestinationController'
    )
    const withAuth = requireAuth(authService)
    const withOptionalAuth = optionalAuth(authService)
    const catalogSync = this.container.resolve('catalogSyncService')
    const openPayments = this.container.resolve('openPayments')
    const frontendOrigin = new URL(env.FRONTEND_URL).origin

    app.use(
      cors({
        origin: [frontendOrigin],
        credentials: true
      })
    )

    app.use(
      helmet({
        crossOriginResourcePolicy: false
      })
    )
    app.use(express.json())
    app.use(express.urlencoded({ extended: true, limit: '25mb' }))
    app.use(
      '/images',
      express.static(path.join(__dirname, '..', 'images'), {
        maxAge: 31536000
      })
    )

    router.get(
      '/config',
      async (_req: Request, res: TypedResponse, next: NextFunction) => {
        try {
          res.json(
            toSuccessResponse({
              ...(await openPayments.getShopAsset()),
              ...catalogSync.getStatus()
            })
          )
        } catch (e) {
          next(e)
        }
      }
    )

    router.get('/catalog', productController.catalog)
    router.get('/products', productController.list)
    router.get('/products/:slug', productController.get)

    router.post('/bills/lookup', billController.lookup)
    router.post('/efecty/quote', moneyController.quote)
    router.post('/breb/resolve', moneyController.resolve)

    router.post('/auth/register', authController.register)
    router.post('/auth/login', authController.login)
    router.post('/auth/logout', withAuth, authController.logout)

    router.get('/me', withAuth, meController.me)
    router.delete('/me/grant', withAuth, meController.clearGrant)
    router.get('/me/bills', withAuth, savedBillController.list)
    router.post('/me/bills', withAuth, savedBillController.save)
    router.patch('/me/bills/:id', withAuth, savedBillController.update)
    router.delete('/me/bills/:id', withAuth, savedBillController.remove)
    router.get('/me/destinations', withAuth, savedDestinationController.list)
    router.post('/me/destinations', withAuth, savedDestinationController.save)
    router.patch(
      '/me/destinations/:id',
      withAuth,
      savedDestinationController.update
    )
    router.delete(
      '/me/destinations/:id',
      withAuth,
      savedDestinationController.remove
    )

    router.post('/orders', withOptionalAuth, orderController.create)
    router.post(
      '/orders/instant-buy',
      withOptionalAuth,
      orderController.instantBuy
    )
    router.post('/orders/setup-one-click', orderController.setup)
    router.post(
      '/orders/setup-one-click/finish',
      withOptionalAuth,
      orderController.setupFinish
    )
    router.patch('/orders/:id', orderController.finish)
    router.get('/orders/:id', orderController.get)

    // Internal only (no auth): exposes the provider that executed each payment
    router.get('/admin/orders', orderController.admin)

    router.use('*', (req: Request, res: TypedResponse) => {
      const e = Error(`Requested path ${req.path} was not found.`)

      res.status(404).send({
        success: false,
        message: e.message
      })
    })

    app.use(router)

    app.use(
      (
        e: Error & { type?: string },
        req: Request,
        res: TypedResponse,
        next: NextFunction
      ) => {
        let err: Error = e
        if (e.type === 'entity.parse.failed') {
          err = new BadRequest('Invalid JSON')
        } else if (e.type === 'entity.too.large') {
          err = new PayloadTooLarge()
        }
        initErrorHandler(logger)(err, req, res, next)
      }
    )

    return app
  }

  private async processPendingPayments() {
    const paymentService = this.container.resolve('paymentService')
    const logger = this.container.resolve('logger')
    return paymentService
      .processPendingPayments()
      .catch((err) => {
        logger.error('Error while trying to process pending payments')
        logger.error(err)
        return false
      })
      .then((trx) => {
        if (trx) {
          process.nextTick(() => this.processPendingPayments())
        } else {
          setTimeout(() => this.processPendingPayments(), 5000).unref()
        }
      })
  }

  private async processOneClickCache() {
    const oneClickCache = this.container.resolve('oneClickCache')
    oneClickCache.processExpired()
    setTimeout(() => this.processOneClickCache(), 5000).unref()
  }

  private async processSettlements() {
    const settlementService = this.container.resolve('settlementService')
    const logger = this.container.resolve('logger')
    await settlementService.retryPending().catch((err) => {
      logger.error('Error while retrying pending settlements')
      logger.error(err)
    })
    setTimeout(() => this.processSettlements(), 10000).unref()
  }

  async processResources() {
    process.nextTick(() => this.processPendingPayments())
    process.nextTick(() => this.processOneClickCache())
    process.nextTick(() => this.processSettlements())
  }
}
