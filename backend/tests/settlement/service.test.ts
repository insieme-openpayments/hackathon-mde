import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { Knex } from 'knex'
import { truncateTables } from '@/tests/tables'
import { seedCatalog, seedMoneyProducts } from '../helpers'
import { SettlementService } from '@/settlement/service'
import { HttpError, type IIntegrationClient } from '@/integration/client'
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

  async function createCompletedOrder(
    slug = 'vanti',
    price = 50000,
    details: Record<string, unknown> = { kind: 'servicio', ref1: '123456' }
  ): Promise<Order> {
    const product = await knex('products').where({ slug }).first()
    const order = await orderService.create(
      {
        orderItems: [
          {
            productId: product.id,
            quantity: 1,
            price,
            details
          }
        ]
      } as never,
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
      'paidAt',
      'receipt'
    ])
  })

  describe('with integration client', (): void => {
    const efectyDetails = {
      kind: 'efecty',
      recipientDocument: '1020304050',
      recipientName: 'Ana Pérez',
      fee: 3000,
      total: 53000
    }

    function serviceWith(client: Partial<IIntegrationClient>) {
      return new SettlementService(
        container.resolve('logger'),
        orderService,
        client as IIntegrationClient
      )
    }

    beforeEach(async (): Promise<void> => {
      await seedMoneyProducts(knex)
    })

    test('efecty sends amount without fee and stores claim receipt', async (): Promise<void> => {
      const efectySend = jest.fn().mockResolvedValue({
        transfer_id: 'EF-1',
        status: 'created',
        message: 'Giro creado',
        expires_at: '2026-11-01T00:00:00Z',
        claim: {
          method: 'cash',
          instructions: 'Ve a Efecty',
          network: 'Efecty'
        }
      })
      const order = await createCompletedOrder('efecty', 53000, efectyDetails)
      const settlement = await serviceWith({ efectySend }).settle(order)

      expect(efectySend).toHaveBeenCalledWith({
        recipient_document: '1020304050',
        recipient_name: 'Ana Pérez',
        recipient_phone: null,
        amount: 50000
      })
      expect(settlement?.authCode).toBe('EF-1')
      expect(settlement?.receipt?.instructions).toBe('Ve a Efecty')
      expect(settlement?.receipt?.network).toBe('Efecty')
      const stored = await Order.query().findById(order.id)
      expect(stored?.status).toBe(OrderStatus.SETTLED)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Giro disponible para reclamar en Efecty'
      )
    })

    test('breb settles', async (): Promise<void> => {
      const brebSend = jest.fn().mockResolvedValue({
        transfer_id: 'BR-1',
        status: 'completed',
        message: 'ok',
        holder_name: 'Luis G.',
        bank: 'Banco X'
      })
      const order = await createCompletedOrder('breb', 20000, {
        kind: 'breb',
        key: '3001234567'
      })
      const settlement = await serviceWith({ brebSend }).settle(order)
      expect(settlement?.authCode).toBe('BR-1')
      expect(settlement?.receipt?.holderName).toBe('Luis G.')
      const stored = await Order.query().findById(order.id)
      expect(stored?.status).toBe(OrderStatus.SETTLED)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Transferencia Bre-B enviada'
      )
    })

    test('servicio approved and pending', async (): Promise<void> => {
      const payService = jest
        .fn()
        .mockResolvedValueOnce({
          status: 'approved',
          transaction_id: 77,
          authorization_code: 'AUTH9'
        })
        .mockResolvedValueOnce({
          status: 'pending',
          transaction_id: 78,
          authorization_code: null
        })
      const svc = serviceWith({ payService })
      const a = await createCompletedOrder('vanti', 50000, {
        kind: 'factura',
        ref1: '999',
        trace: 'T1'
      })
      const sa = await svc.settle(a)
      expect(payService).toHaveBeenCalledWith({
        trace: 'T1',
        company_id: 'vanti',
        reference: '999',
        amount: 50000,
        client_ip: null
      })
      expect(sa?.authCode).toBe('AUTH9')
      expect(sa?.receipt?.reference).toBe('77')

      const b = await createCompletedOrder()
      const sb = await svc.settle(b)
      expect(sb?.receipt?.status).toBe('pending')
      const stored = await Order.query().findById(b.id)
      expect(stored?.status).toBe(OrderStatus.SETTLED)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Pago en proceso en la red de recaudo'
      )
    })

    test('servicio rejected fails without failover', async (): Promise<void> => {
      const payService = jest.fn().mockResolvedValue({
        status: 'rejected',
        transaction_id: 1,
        message: 'Referencia inválida'
      })
      const order = await createCompletedOrder()
      await serviceWith({ payService }).settle(order)
      const stored = await Order.query().findById(order.id)
      expect(stored?.status).toBe(OrderStatus.SETTLEMENT_FAILED)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Error de liquidación: Referencia inválida'
      )
    })

    test('HttpError 409 fails with detail and no failover', async (): Promise<void> => {
      const efectySend = jest
        .fn()
        .mockRejectedValue(new HttpError(409, 'Giro duplicado'))
      const order = await createCompletedOrder('efecty', 53000, efectyDetails)
      const settlement = await serviceWith({ efectySend }).settle(order)

      expect(efectySend).toHaveBeenCalledTimes(1)
      expect(settlement?.status).toBe('FAILED')
      expect(settlement?.authCode).toBeFalsy()
      const stored = await Order.query().findById(order.id)
      expect(stored?.status).toBe(OrderStatus.SETTLEMENT_FAILED)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Error de liquidación: Giro duplicado'
      )
      expect(
        stored?.events.some((e) => e.message.includes('reintentando'))
      ).toBe(false)

      // retryPending must not retry a FAILED settlement
      await serviceWith({ efectySend }).retryPending()
      expect(efectySend).toHaveBeenCalledTimes(1)
    })

    test('504 asks to check status before retrying', async (): Promise<void> => {
      const brebSend = jest
        .fn()
        .mockRejectedValue(new HttpError(504, 'timeout'))
      const order = await createCompletedOrder('breb', 20000, {
        kind: 'breb',
        key: '3001234567'
      })
      await serviceWith({ brebSend }).settle(order)
      const stored = await Order.query().findById(order.id)
      expect(stored?.events.map((e) => e.message)).toContain(
        'Error de liquidación: No se pudo confirmar la operación; consulta el estado antes de reintentar'
      )
    })
  })

  describe('without client, new kinds use simulated providers', (): void => {
    test('efecty-sim settles', async (): Promise<void> => {
      await seedMoneyProducts(knex)
      const order = await createCompletedOrder('efecty', 53000, {
        kind: 'efecty',
        recipientDocument: '1020304050',
        recipientName: 'Ana',
        fee: 3000,
        total: 53000
      })
      const settlement = await settlementService.settle(order)
      expect(settlement?.receipt?.instructions).toBeTruthy()
      const stored = await Order.query().findById(order.id)
      expect(stored?.status).toBe(OrderStatus.SETTLED)
    })
  })
})
