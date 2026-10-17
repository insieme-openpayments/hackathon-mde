import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { Knex } from 'knex'
import { IOrderService } from '@/order/service'
import { randomUUID } from 'crypto'
import { mockProduct } from '../mocks'
import { createProducts } from '../helpers'
import { OrderStatus, type Order } from '@/order/model'
import { IUserService } from '@/user/service'
import { deleteProperty, NotFound } from '@/lib'
import { truncateTables } from '@/tests/tables'
import { Payment } from '@/payment/model'

describe('Order Service', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let knex: Knex
  let userService: IUserService
  let orderService: IOrderService
  let order: Order

  const walletAddress = 'https://ilp.example.com'
  const productOne = mockProduct()
  const productTwo = mockProduct({ name: 'Product #2', price: 20 })
  const orderItems = [
    {
      productId: productOne.id,
      quantity: 5
    },
    {
      productId: productTwo.id,
      quantity: 3
    }
  ]

  async function createOrder(): Promise<Order> {
    await createProducts([productOne, productTwo])

    const user = await userService.create(walletAddress)
    return await orderService.create(
      {
        userId: user.id,
        orderItems
      },
      app.knex
    )
  }

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
    knex = app.knex
    userService = container.resolve('userService')
    orderService = container.resolve('orderService')
  })

  beforeEach(async (): Promise<void> => {
    order = await createOrder()
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await knex.destroy()
  })

  afterEach(async (): Promise<void> => {
    await truncateTables(knex)
  })

  describe('create', (): void => {
    test('can create an order without a user ID', async (): Promise<void> => {
      const params = {
        orderItems
      }
      const order = await orderService.create(params, app.knex)

      expect(order).toMatchObject(params)
      expect(order.userId).toBeNull()
    })

    test('can create an order with a user ID', async (): Promise<void> => {
      const user = await userService.create(walletAddress + '/alice')
      const params = {
        userId: user.id,
        orderItems
      }
      const order = await orderService.create(params, app.knex)

      expect(order).toMatchObject(params)
      expect(order.userId).toEqual(params.userId)
    })
  })

  describe('get', (): void => {
    it('throws a NotFound exception if the order does not exist', async (): Promise<void> => {
      await expect(orderService.get(randomUUID())).rejects.toThrowError(
        NotFound
      )
    })

    it('throws a NotFound exception if the order does not belong to the current user', async (): Promise<void> => {
      await expect(
        orderService.get(order.id, randomUUID())
      ).rejects.toThrowError(NotFound)
    })

    it('should return the order with the given id', async (): Promise<void> => {
      await expect(orderService.get(order.id)).resolves.toMatchObject(order)
    })

    it('should include the products and never expose payment secrets', async (): Promise<void> => {
      await Payment.query().insert({
        orderId: order.id,
        walletAddress: walletAddress,
        incomingPaymentUrl: 'https://ilp.example.com/incoming-payments/1',
        quoteId: 'quote-1',
        continueUri: 'https://auth.example.com/continue/1',
        continueToken: 'secret-token',
        interactUrl: 'https://auth.example.com/interact/1',
        interactNonce: 'interact-nonce',
        clientNonce: 'client-nonce'
      })

      const fetched = await orderService.get(order.id)
      expect(fetched.orderItems[0].product).toBeDefined()
      expect(fetched.payments).toMatchObject({
        quoteId: 'quote-1',
        incomingPaymentUrl: 'https://ilp.example.com/incoming-payments/1'
      })
      expect(fetched.payments).not.toHaveProperty('continueToken')
      expect(fetched.payments).not.toHaveProperty('continueUri')
      expect(fetched.payments).not.toHaveProperty('clientNonce')
      expect(fetched.payments).not.toHaveProperty('interactNonce')
    })

    it('should return the order that belongs tot the current user', async (): Promise<void> => {
      await expect(
        orderService.get(order.id, order.userId)
      ).resolves.toMatchObject(order)
    })
  })

  describe('list', (): void => {
    it('should return an empty array if the user does not have any orders', async (): Promise<void> => {
      await expect(orderService.list(randomUUID())).resolves.toEqual([])
    })

    it("should return the user's orders", async (): Promise<void> => {
      const expected = deleteProperty(order, 'orderItems')
      await expect(orderService.list(order.userId)).resolves.toEqual([expected])
    })
  })

  describe('complete', (): void => {
    it('should update the order status to "COMPLETED"', async (): Promise<void> => {
      const completedOrder = await orderService.complete(order.id)
      expect(completedOrder?.status).toBe(OrderStatus.COMPLETED)
    })

    it('should return undefined when trying to update a non-existing order status to "COMPLETED"', async (): Promise<void> => {
      const completedOrder = await orderService.complete(randomUUID())
      expect(completedOrder?.status).toBeUndefined()
    })
  })

  describe('reject', (): void => {
    it('should update the order status to "REJECTED"', async (): Promise<void> => {
      const completedOrder = await orderService.reject(order.id)
      expect(completedOrder?.status).toBe(OrderStatus.REJECTED)
    })

    it('should return undefined when trying to update a non-existing order status to "REJECTED"', async (): Promise<void> => {
      const completedOrder = await orderService.reject(randomUUID())
      expect(completedOrder?.status).toBeUndefined()
    })
  })
})
