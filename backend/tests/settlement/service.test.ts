import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { Knex } from 'knex'
import { truncateTables } from '@/tests/tables'
import { seedCatalog } from '../helpers'
import { Order, OrderStatus } from '@/order/model'
import { Payment, PaymentStatus } from '@/payment/model'
import { Settlement } from '@/settlement/model'
import { ISettlementService } from '@/settlement/service'
import { IOrderService } from '@/order/service'
import { randomUUID } from 'crypto'

describe('Settlement Service', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let knex: Knex
  let settlementService: ISettlementService
  let orderService: IOrderService

  async function createCompletedOrder(): Promise<Order> {
    const product = await knex('products').where({ slug: 'vanti' }).first()
    const order = await orderService.create(
      {
        orderItems: [
          {
            productId: product.id,
            quantity: 1,
            price: 50000,
            details: { kind: 'servicio', ref1: '123456' }
          }
        ]
      },
      knex
    )
    await order.calculateTotalAmount(knex)
    await Payment.query().insert({
      orderId: order.id,
      walletAddress: 'https://ilp.example.com/alice',
      incomingPaymentUrl: `https://ilp.example.com/incoming-payments/${randomUUID()}`,
      quoteId: 'quote',
      continueUri: 'https://auth.example.com/continue',
      continueToken: 'token',
      interactUrl: 'https://auth.example.com/interact',
      interactNonce: 'in',
      clientNonce: 'cn',
      status: PaymentStatus.COMPLETED
    })
    await orderService.complete(order.id)
    return (await Order.query().findById(order.id)) as Order
  }

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
    knex = app.knex
    settlementService = container.resolve('settlementService')
    orderService = container.resolve('orderService')
  })

  beforeEach(async (): Promise<void> => {
    await seedCatalog(knex)
  })

  afterEach(async (): Promise<void> => {
    delete process.env.SIM_FAIL_PROVIDER
    await truncateTables(knex)
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await knex.destroy()
  })

  test('settles once under concurrent calls', async (): Promise<void> => {
    const order = await createCompletedOrder()
    const results = await Promise.all([
      settlementService.settle(order),
      settlementService.settle(order),
      settlementService.settle(order)
    ])
    expect(new Set(results.map((r) => r?.authCode)).size).toBe(1)
    expect(await Settlement.query().resultSize()).toBe(1)

    const stored = await Order.query().findById(order.id)
    expect(stored?.status).toBe(OrderStatus.SETTLED)
    expect(
      stored?.events.filter((e) => e.message === 'Factura pagada en Colombia')
    ).toHaveLength(1)

    // A later call is a no-op and returns the same receipt
    const again = await settlementService.settle(order)
    expect(again?.authCode).toBe(results[0]?.authCode)
    expect(await Settlement.query().resultSize()).toBe(1)
  })

  test('fails over to the next provider', async (): Promise<void> => {
    process.env.SIM_FAIL_PROVIDER = 'puntored'
    const order = await createCompletedOrder()
    const settlement = await settlementService.settle(order)

    expect(settlement?.provider).not.toBe('puntored')
    expect(settlement?.attempts[0].provider).toBe('puntored')
    const stored = await Order.query().findById(order.id)
    expect(stored?.status).toBe(OrderStatus.SETTLED)
    expect(stored?.events.map((e) => e.message)).toEqual(
      expect.arrayContaining([
        'Red de recaudo no disponible; reintentando con otra red',
        'Factura pagada en Colombia'
      ])
    )
    expect(JSON.stringify(stored?.events)).not.toContain('puntored')
  })

  test('marks SETTLEMENT_FAILED when every provider fails', async (): Promise<void> => {
    process.env.SIM_FAIL_PROVIDER = 'puntored,recaudo-b,breb'
    const order = await createCompletedOrder()
    await settlementService.settle(order)

    const stored = await Order.query().findById(order.id)
    expect(stored).toBeDefined()
    expect(stored?.status).toBe(OrderStatus.SETTLEMENT_FAILED)
    expect(
      stored?.events.some((e) => e.message.startsWith('Error de liquidación:'))
    ).toBe(true)
  })

  test('retryPending settles COMPLETED orders without settlement', async (): Promise<void> => {
    const order = await createCompletedOrder()
    await settlementService.retryPending()

    const stored = await Order.query().findById(order.id)
    expect(stored?.status).toBe(OrderStatus.SETTLED)
    expect(await Settlement.query().resultSize()).toBe(1)
  })

  test('public order view hides the provider', async (): Promise<void> => {
    const order = await createCompletedOrder()
    await settlementService.settle(order)
    const json = (await orderService.get(order.id)).$toJson() as unknown as {
      settlement: Record<string, unknown>
    }
    expect(Object.keys(json.settlement).sort()).toEqual([
      'amount',
      'authCode',
      'paidAt'
    ])
  })
})
