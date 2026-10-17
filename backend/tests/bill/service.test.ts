import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { seedCatalog } from '@/tests/helpers'
import { MoneyService } from '@/money/service'
import { BillService, snapshotKey } from '@/bill/service'
import { simulateBill } from '@/bill/simulate'
import {
  HttpError,
  IntegrationUnavailable,
  type IIntegrationClient,
  type IntegrationValidation
} from '@/integration/client'
import { BadRequest } from '@/lib'
import type { OrderItemInput } from '@insieme/shared'
import type { BillSnapshotCache } from '@/cache/bill-snapshot'
import { InMemoryCache } from '@/lib'
import type { BillSnapshot } from '@/cache/bill-snapshot'
import type { IProductService } from '@/product/service'
import type { Logger } from 'winston'

const validation = (
  overrides: Partial<IntegrationValidation> = {}
): IntegrationValidation => ({
  valid: true,
  company_id: 'vanti',
  company_name: 'Vanti S.A. ESP',
  category: 'gas',
  reference: '123456',
  amount: 214300,
  currency: 'COP',
  partial_allowed: true,
  min_amount: 1000,
  max_amount: 214300,
  due_date: '2026-11-03',
  ...overrides
})

describe('Bill Service', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let productService: IProductService
  let logger: Logger
  let cache: BillSnapshotCache
  let validateService: jest.Mock
  let client: IIntegrationClient

  const build = (withClient: IIntegrationClient | null = client) =>
    new BillService(
      logger,
      productService,
      withClient,
      cache,
      new MoneyService(logger, productService, withClient)
    )

  const productId = async (slug: string) =>
    (await productService.getBySlug(slug)).id

  const item = async (
    slug: string,
    overrides: Record<string, unknown> = {}
  ): Promise<OrderItemInput> =>
    ({
      productId: await productId(slug),
      kind: 'servicio',
      details: { ref1: '123456' },
      ...overrides
    }) as OrderItemInput

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
    productService = container.resolve('productService')
    logger = container.resolve('logger')
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await app.knex.destroy()
  })

  beforeEach(async (): Promise<void> => {
    await truncateTables(app.knex)
    await seedCatalog(app.knex)
    cache = new InMemoryCache<BillSnapshot>()
    validateService = jest.fn()
    client = {
      getCatalog: jest.fn(),
      validateService
    } as unknown as IIntegrationClient
  })

  afterEach((): void => {
    jest.restoreAllMocks()
  })

  describe('lookup (integration-backend)', (): void => {
    it('maps a 200 response and stores a snapshot', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(validation())
      const id = await productId('vanti')

      const result = await build().lookup(id, '123456')

      expect(validateService).toHaveBeenCalledWith('vanti', '123456')
      expect(result).toMatchObject({
        productId: id,
        convenio: 'vanti',
        name: 'Vanti S.A. ESP',
        category: 'gas',
        ref1: '123456',
        amount: 214300,
        partial: true,
        minAmount: 1000,
        maxAmount: 214300,
        fixedAmount: null,
        dueDate: '2026-11-03'
      })
      // A real upstream bill carries no invented holder or concept.
      expect(result.holder).toBeNull()
      expect(result.concept).toBeNull()
      await expect(cache.get(snapshotKey(id, '123456'))).resolves.toMatchObject(
        {
          amount: 214300,
          partial: true,
          holder: null,
          concept: null,
          source: 'integration-backend'
        }
      )
    })

    it('turns a 404 into a BadRequest with errors.ref1', async (): Promise<void> => {
      validateService.mockRejectedValueOnce(
        new HttpError(
          404,
          'No encontramos una factura pendiente con esta referencia'
        )
      )
      const err = await build()
        .lookup(await productId('vanti'), '000000')
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.statusCode).toBe(400)
      expect(err.errors).toEqual({
        ref1: 'No encontramos una factura pendiente con esta referencia'
      })
    })

    it('turns a 422 into a BadRequest with errors.ref1', async (): Promise<void> => {
      validateService.mockRejectedValueOnce(
        new HttpError(422, 'La referencia debe tener entre 6 y 20 dígitos')
      )
      const err = await build()
        .lookup(await productId('vanti'), '123456')
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors.ref1).toContain('6 y 20')
    })

    it('falls back to the local simulation when the integration is unavailable', async (): Promise<void> => {
      validateService.mockRejectedValueOnce(new IntegrationUnavailable())
      const result = await build().lookup(await productId('vanti'), '123456')
      expect(result.amount).toBe(simulateBill('vanti', '123456'))
      expect(result.partial).toBe(true)
      expect(result.maxAmount).toBe(result.amount)
    })
  })

  describe('lookup (local)', (): void => {
    it('simulates a deterministic bill', async (): Promise<void> => {
      const service = build(null)
      const id = await productId('enel')
      const a = await service.lookup(id, '555555')
      const b = await service.lookup(id, '555555')
      expect(a).toEqual(b)
      expect(a.amount).toBe(simulateBill('enel', '555555'))
      expect(a.partial).toBe(false)
      expect(a.minAmount).toBe(a.amount)
    })

    it('uses the fixed amount of the company', async (): Promise<void> => {
      const result = await build(null).lookup(
        await productId('gas-natural-cundi'),
        '123456'
      )
      expect(result.amount).toBe(10000)
      expect(result.fixedAmount).toBe(10000)
      expect(result.partial).toBe(true)
    })

    it('rejects a reference of zeros with the Spanish message', async (): Promise<void> => {
      const err = await build(null)
        .lookup(await productId('vanti'), '000000')
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toEqual({
        ref1: 'No encontramos una factura pendiente con esta referencia'
      })
    })
  })

  describe('priceOrderItem', (): void => {
    it('reuses the lookup snapshot instead of asking the integration again', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(
        validation({
          company_id: 'enel',
          partial_allowed: false,
          min_amount: 123400,
          max_amount: 123400,
          amount: 123400
        })
      )
      const service = build()
      const id = await productId('enel')
      await service.lookup(id, '123456')

      const priced = await service.priceOrderItem(await item('enel'))

      expect(validateService).toHaveBeenCalledTimes(1)
      expect(priced.price).toBe(123400)
      expect(priced.quantity).toBe(1)
      expect(priced.details).toMatchObject({
        ref1: '123456',
        kind: 'servicio',
        holder: null,
        concept: null,
        dueDate: '2026-11-03'
      })
    })

    it('rejects a non-partial amount different from the snapshot', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(
        validation({
          partial_allowed: false,
          amount: 123400,
          min_amount: 123400,
          max_amount: 123400
        })
      )
      const service = build()
      await service.lookup(await productId('enel'), '123456')
      const err = await service
        .priceOrderItem(await item('enel', { amount: 5000 }))
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toHaveProperty('amount')

      await expect(
        service.priceOrderItem(await item('enel', { amount: 123400 }))
      ).resolves.toMatchObject({ price: 123400 })
    })

    it('enforces partial bounds against the snapshot', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(validation())
      const service = build()
      await service.lookup(await productId('vanti'), '123456')

      const bad = async (amount?: number) =>
        service.priceOrderItem(await item('vanti', { amount })).catch((e) => e)

      expect((await bad()).errors).toHaveProperty('amount')
      expect((await bad(999)).errors).toHaveProperty('amount')
      expect((await bad(214301)).errors).toHaveProperty('amount')
      await expect(
        service.priceOrderItem(await item('vanti', { amount: 1000 }))
      ).resolves.toMatchObject({ price: 1000 })
      await expect(
        service.priceOrderItem(await item('vanti', { amount: 214300 }))
      ).resolves.toMatchObject({ price: 214300 })
      expect(validateService).toHaveBeenCalledTimes(1)
    })

    it('re-resolves the bill when the snapshot has expired', async (): Promise<void> => {
      validateService
        .mockResolvedValueOnce(
          validation({ amount: 100000, max_amount: 100000 })
        )
        .mockResolvedValueOnce(
          validation({ amount: 222200, max_amount: 222200 })
        )
      const service = build()
      await service.lookup(await productId('vanti'), '123456')

      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now + 31 * 60 * 1000)

      const priced = await service.priceOrderItem(
        await item('vanti', { amount: 150000 })
      )
      expect(validateService).toHaveBeenCalledTimes(2)
      expect(priced.price).toBe(150000)
    })

    it('re-resolves the bill when there is no snapshot', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(
        validation({
          partial_allowed: false,
          amount: 99900,
          min_amount: 99900,
          max_amount: 99900
        })
      )
      const priced = await build().priceOrderItem(await item('enel'))
      expect(validateService).toHaveBeenCalledTimes(1)
      expect(priced.price).toBe(99900)
    })

    it('rejects an invalid reference when re-resolving locally', async (): Promise<void> => {
      const err = await build(null)
        .priceOrderItem(
          await item('vanti', { amount: 5000, details: { ref1: '000000' } })
        )
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors.ref1).toBeDefined()
    })

    it('prices a "factura" with its own amount and requires an email', async (): Promise<void> => {
      const service = build(null)
      const noEmail = await service
        .priceOrderItem(await item('vanti', { kind: 'factura', amount: 20000 }))
        .catch((e) => e)
      expect(noEmail.errors).toEqual({ email: expect.any(String) })

      const tooMuch = await service
        .priceOrderItem(
          await item('vanti', {
            kind: 'factura',
            amount: 5_000_001,
            details: { ref1: '123456', email: 'a@b.co' }
          })
        )
        .catch((e) => e)
      expect(tooMuch.errors).toHaveProperty('amount')

      const ok = await service.priceOrderItem(
        await item('vanti', {
          kind: 'factura',
          amount: 20000,
          details: { ref1: '123456', ref2: '77', email: 'a@b.co' }
        })
      )
      expect(ok.price).toBe(20000)
      expect(ok.details).toMatchObject({
        ref1: '123456',
        ref2: '77',
        email: 'a@b.co',
        kind: 'factura'
      })
      expect(validateService).not.toHaveBeenCalled()
    })
  })
  describe('trace and requires_amount', (): void => {
    it('keeps the trace in the snapshot and in the order details', async (): Promise<void> => {
      validateService.mockResolvedValueOnce(
        validation({
          trace: 'trace-123',
          requires_amount: true,
          partial_allowed: false,
          amount: 0,
          max_amount: 0,
          due_date: null
        })
      )
      const service = build()
      const id = await productId('vanti')
      const lookup = await service.lookup(id, '123456')
      expect(lookup.partial).toBe(true)
      expect(lookup.maxAmount).toBe(5_000_000)
      await expect(cache.get(snapshotKey(id, '123456'))).resolves.toMatchObject(
        { trace: 'trace-123', requiresAmount: true }
      )

      const priced = await service.priceOrderItem(
        await item('vanti', { amount: 25000 })
      )
      expect(priced.price).toBe(25000)
      expect(priced.details).toMatchObject({ trace: 'trace-123' })
    })
  })
})
