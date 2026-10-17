import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { seedCatalog, seedMoneyProducts } from '@/tests/helpers'
import { createRequest, createResponse } from 'node-mocks-http'
import { NextFunction, Request, Response } from 'express'
import { IOrderController } from '@/order/controller'
import { IOpenPayments } from '@/open-payments/service'
import { IProductService } from '@/product/service'
import { IOrderService } from '@/order/service'
import { IBillController } from '@/bill/controller'
import { simulateBill } from '@/bill/simulate'
import { Order } from '@/order/model'
import { Payment } from '@/payment/model'

const walletAddressUrl = 'https://ilp.example.com/alice'

describe('Order Controller', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let orderController: IOrderController
  let billController: IBillController
  let openPayments: IOpenPayments
  let productService: IProductService
  let orderService: IOrderService

  const next = jest.fn() as unknown as NextFunction

  const run = async (
    handler: IOrderController['create'] | IOrderController['instantBuy'],
    body: Record<string, unknown>
  ) => {
    const req = createRequest<Request>({ body })
    const res = createResponse<Response>()
    await handler(req, res, (err) => {
      next()
      app.errorHandler(err, req, res, next)
    })
    return res
  }

  const item = async (slug: string, extra: Record<string, unknown> = {}) => ({
    productId: (await productService.getBySlug(slug)).id,
    kind: 'servicio',
    details: { ref1: '123456' },
    ...extra
  })

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
    orderController = container.resolve('orderController')
    billController = container.resolve('billController')
    openPayments = container.resolve('openPayments')
    productService = container.resolve('productService')
    orderService = container.resolve('orderService')
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await app.knex.destroy()
  })

  beforeEach(async (): Promise<void> => {
    await truncateTables(app.knex)
    await seedCatalog(app.knex)
    await seedMoneyProducts(app.knex)
    jest.spyOn(openPayments, 'preparePayment').mockResolvedValue({
      interact: { redirect: 'https://wallet.example/consent' }
    } as never)
  })

  afterEach((): void => {
    jest.restoreAllMocks()
  })

  describe('create', (): void => {
    it('returns 400 with two items', async (): Promise<void> => {
      const one = await item('vanti', { amount: 5000 })
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [one, one]
      })
      expect(res.statusCode).toBe(400)
      expect(res._getJSONData().errors).toHaveProperty('products')
      expect(openPayments.preparePayment).not.toHaveBeenCalled()
    })

    it('returns 400 keyed by the full path when ref1 is invalid', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('vanti', { details: { ref1: '12ab' } })]
      })
      expect(res.statusCode).toBe(400)
      expect(res._getJSONData().errors).toHaveProperty([
        'products.0.details.ref1'
      ])
    })

    it('returns 400 with errors.amount when a non-partial amount mismatches', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('enel', { amount: 1234 })]
      })
      expect(res.statusCode).toBe(400)
      expect(res._getJSONData().errors).toHaveProperty('amount')
    })

    it('creates the order with a manual amount and persists the details', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('vanti', { amount: 18000 })]
      })
      expect(res.statusCode).toBe(201)
      const { result } = res._getJSONData()
      expect(result.redirectUrl).toBe('https://wallet.example/consent')
      expect(result.orderId).toEqual(expect.any(String))
      expect(openPayments.preparePayment).toHaveBeenCalledTimes(1)

      const order = await orderService.get(result.orderId)
      expect(order.total).toBe(18000)
      expect(order.orderItems).toHaveLength(1)
      expect(order.orderItems[0].price).toBe(18000)
      expect(order.orderItems[0].details).toMatchObject({
        ref1: '123456',
        kind: 'servicio',
        holder: expect.any(String),
        concept: expect.any(String),
        dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      })
      expect(order.orderItems[0].product?.slug).toBe('vanti')
    })

    it('deletes the order when preparing the payment fails', async (): Promise<void> => {
      jest
        .spyOn(openPayments, 'preparePayment')
        .mockRejectedValue(new Error('boom'))
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('vanti', { amount: 18000 })]
      })
      expect(res.statusCode).toBe(500)
      expect(await Order.query()).toHaveLength(0)
    })

    it('prices a non-partial service with the amount of the lookup snapshot', async (): Promise<void> => {
      const enel = await productService.getBySlug('enel')
      const lookupRes = createResponse<Response>()
      await billController.lookup(
        createRequest<Request>({
          body: { productId: enel.id, ref1: '123456' }
        }),
        lookupRes,
        next
      )
      const billed = lookupRes._getJSONData().result.amount
      expect(billed).toBe(simulateBill('enel', '123456'))

      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('enel')]
      })
      expect(res.statusCode).toBe(201)
      const order = await Order.query().findById(
        res._getJSONData().result.orderId
      )
      expect(order?.total).toBe(billed)
    })

    it('creates a "factura" order with its own amount and email', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [
          await item('vanti', {
            kind: 'factura',
            amount: 80000,
            details: { ref1: '123456', email: 'ana@example.com' }
          })
        ]
      })
      expect(res.statusCode).toBe(201)
      const order = await orderService.get(res._getJSONData().result.orderId)
      expect(order.total).toBe(80000)
      expect(order.orderItems[0].details).toMatchObject({
        kind: 'factura',
        email: 'ana@example.com'
      })
    })
  })

  describe('create (money products)', (): void => {
    it('creates an efecty order charging amount + fee', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [
          {
            productId: (await productService.getBySlug('efecty')).id,
            kind: 'efecty',
            amount: 250000,
            details: {
              recipientDocument: '1.020.304.050',
              recipientName: 'Ana Pérez'
            }
          }
        ]
      })
      expect(res.statusCode).toBe(201)
      const order = await orderService.get(res._getJSONData().result.orderId)
      expect(order.total).toBe(250000)
      expect(order.orderItems[0].details).toMatchObject({
        kind: 'efecty',
        recipientDocument: '1020304050',
        recipientName: 'Ana Pérez',
        fee: 0,
        total: 250000
      })
    })

    it('returns 400 with errors.amount when the giro exceeds the maximum', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [
          {
            productId: (await productService.getBySlug('efecty')).id,
            kind: 'efecty',
            amount: 2000000,
            details: {
              recipientDocument: '1020304050',
              recipientName: 'Ana Pérez'
            }
          }
        ]
      })
      expect(res.statusCode).toBe(400)
      expect(res._getJSONData().errors).toHaveProperty('amount')
    })

    it('returns 400 with errors.key for a Bre-B key that does not exist', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [
          {
            productId: (await productService.getBySlug('breb')).id,
            kind: 'breb',
            amount: 5000,
            details: { key: '3001234560' }
          }
        ]
      })
      expect(res.statusCode).toBe(400)
      expect(res._getJSONData().errors).toHaveProperty('key')
    })

    it('creates a Bre-B order', async (): Promise<void> => {
      const res = await run(orderController.create, {
        walletAddressUrl,
        products: [
          {
            productId: (await productService.getBySlug('breb')).id,
            kind: 'breb',
            amount: 5000,
            details: { key: 'ana@correo.com', description: 'Arriendo' }
          }
        ]
      })
      expect(res.statusCode).toBe(201)
      const order = await orderService.get(res._getJSONData().result.orderId)
      expect(order.total).toBe(5000)
      expect(order.orderItems[0].details).toMatchObject({
        kind: 'breb',
        key: 'ana@correo.com',
        keyType: 'email',
        description: 'Arriendo'
      })
    })
  })

  describe('instantBuy', (): void => {
    it('returns the token info and the orderId', async (): Promise<void> => {
      jest.spyOn(openPayments, 'instantBuy').mockResolvedValue({
        accessToken: 'token',
        manageUrl: 'https://auth.example.com/token/1'
      } as never)

      const res = await run(orderController.instantBuy, {
        walletAddressUrl,
        accessToken: 'token',
        manageUrl: 'https://auth.example.com/token/1',
        products: [await item('vanti', { amount: 18000 })]
      })

      expect(res.statusCode).toBe(200)
      expect(res._getJSONData().result).toMatchObject({
        accessToken: 'token',
        manageUrl: 'https://auth.example.com/token/1',
        walletAddressUrl,
        orderId: expect.any(String)
      })
      const order = await Order.query().findById(
        res._getJSONData().result.orderId
      )
      expect(order?.total).toBe(18000)
    })
  })

  describe('finish', (): void => {
    const runFinish = async (id: string, body: Record<string, unknown>) => {
      const req = createRequest<Request>({ params: { id }, body })
      const res = createResponse<Response>()
      await orderController.finish(req, res, (err) => {
        next()
        app.errorHandler(err, req, res, next)
      })
      return res
    }

    it('returns 400 for a non-uuid id', async (): Promise<void> => {
      const res = await runFinish('abc', { result: 'grant_rejected' })
      expect(res.statusCode).toBe(400)
    })

    it('returns 409 for an order that is no longer pending', async (): Promise<void> => {
      const created = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('vanti', { amount: 18000 })]
      })
      const id = created._getJSONData().result.orderId
      await Order.query()
        .patch({ status: 'FAILED' as never })
        .where({ id })
      const res = await runFinish(id, { result: 'grant_rejected' })
      expect(res.statusCode).toBe(409)
    })

    const createWithPayment = async (
      extra: Partial<Record<string, unknown>> = {}
    ) => {
      const created = await run(orderController.create, {
        walletAddressUrl,
        products: [await item('vanti', { amount: 18000 })]
      })
      const id = created._getJSONData().result.orderId as string
      await Payment.query().insert({
        orderId: id,
        quoteId: 'q',
        incomingPaymentUrl: 'https://ilp.example.com/incoming/1',
        interactUrl: 'https://wallet.example/consent',
        continueUri: 'https://auth.example/continue',
        continueToken: 'tok',
        interactNonce: 'in',
        clientNonce: 'cn',
        walletAddress: walletAddressUrl,
        status: 'PENDING',
        ...extra
      } as never)
      return id
    }

    const rejectionEvents = (order: Order) =>
      order.events.filter(
        (e) => e.message === 'Pagador rechazó la autorización'
      )

    it('rejects (not fails) a payment refused long after creation', async (): Promise<void> => {
      const id = await createWithPayment({ attempts: 10 })
      const res = await runFinish(id, { result: 'grant_rejected' })
      expect(res.statusCode).toBe(200)
      const order = await Order.query().findById(id)
      expect(order?.status).toBe('REJECTED')
      expect(rejectionEvents(order as Order)).toHaveLength(1)
    })

    it('records a single rejection for concurrent callbacks', async (): Promise<void> => {
      const id = await createWithPayment()
      await Promise.all([
        runFinish(id, { result: 'grant_rejected' }),
        runFinish(id, { result: 'grant_rejected' })
      ])
      const order = await Order.query().findById(id)
      expect(rejectionEvents(order as Order)).toHaveLength(1)
    })

    it('answers 200 to a replayed interact callback without a new event', async (): Promise<void> => {
      const id = await createWithPayment({ authorizedAt: new Date() })
      const before = (await Order.query().findById(id))?.events.length
      jest.spyOn(openPayments, 'verifyHash').mockResolvedValue()
      const res = await runFinish(id, {
        interactRef: '11111111-1111-4111-8111-111111111111',
        hash: 'x'
      })
      expect(res.statusCode).toBe(200)
      expect((await Order.query().findById(id))?.events.length).toBe(before)
    })

    it('returns 409 for a result after authorization', async (): Promise<void> => {
      const id = await createWithPayment({ authorizedAt: new Date() })
      const res = await runFinish(id, { result: 'grant_rejected' })
      expect(res.statusCode).toBe(409)
    })

    it('returns 400 for an interaction callback without hash', async (): Promise<void> => {
      const id = await createWithPayment()
      const res = await runFinish(id, {})
      expect(res.statusCode).toBe(400)
    })
  })
})
