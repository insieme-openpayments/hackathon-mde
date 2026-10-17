import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { seedCatalog, seedMoneyProducts } from '@/tests/helpers'
import { MoneyService } from '@/money/service'
import {
  HttpError,
  IntegrationUnavailable,
  type IIntegrationClient
} from '@/integration/client'
import { BadRequest } from '@/lib'
import type { OrderItemInput } from '@insieme/shared'
import type { IProductService } from '@/product/service'
import type { Logger } from 'winston'

const upstreamQuote = {
  amount: 250000,
  fee: 2000,
  total: 252000,
  currency: 'COP',
  max_amount: 1500000,
  min_amount: 10000,
  recipient_document: '1020304050',
  recipient_name: 'Ana Pérez',
  message: 'ok'
}

const upstreamKey = {
  key: 'ana@correo.com',
  key_type: 'email' as const,
  exists: true,
  holder_name: 'An*** Pé***',
  bank: 'Banco Mock Bre-B',
  message: 'Llave Bre-B encontrada.'
}

describe('Money Service', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let productService: IProductService
  let logger: Logger
  let efectyQuote: jest.Mock
  let brebResolve: jest.Mock

  const build = (withClient = true) =>
    new MoneyService(
      logger,
      productService,
      withClient
        ? ({ efectyQuote, brebResolve } as unknown as IIntegrationClient)
        : null
    )

  const efectyInput = {
    recipientDocument: '1020304050',
    recipientName: 'Ana Pérez',
    amount: 250000
  }

  const efectyItem = async (amount = 250000): Promise<OrderItemInput> => ({
    productId: (await productService.getBySlug('efecty')).id,
    kind: 'efecty',
    amount,
    details: {
      recipientDocument: '1020304050',
      recipientName: 'Ana Pérez',
      recipientPhone: '3001234567'
    }
  })

  const brebItem = async (
    key: string,
    amount = 150000
  ): Promise<OrderItemInput> => ({
    productId: (await productService.getBySlug('breb')).id,
    kind: 'breb',
    amount,
    details: { key, description: 'Arriendo' }
  })

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
    await seedMoneyProducts(app.knex)
    efectyQuote = jest.fn()
    brebResolve = jest.fn()
  })

  describe('quoteEfecty', (): void => {
    it('maps the upstream quote and caches it', async (): Promise<void> => {
      efectyQuote.mockResolvedValue(upstreamQuote)
      const service = build()
      const quote = await service.quoteEfecty(efectyInput)
      expect(efectyQuote).toHaveBeenCalledWith({
        recipient_document: '1020304050',
        recipient_name: 'Ana Pérez',
        recipient_phone: null,
        amount: 250000
      })
      expect(quote).toEqual({
        amount: 250000,
        fee: 2000,
        total: 252000,
        currency: 'COP',
        minAmount: 10000,
        maxAmount: 1500000,
        recipientDocument: '1020304050',
        recipientName: 'Ana Pérez',
        message: 'ok',
        simulated: false
      })
      await service.quoteEfecty(efectyInput)
      expect(efectyQuote).toHaveBeenCalledTimes(1)
    })

    it('maps a 422 about the amount to errors.amount', async (): Promise<void> => {
      efectyQuote.mockRejectedValue(
        new HttpError(422, 'El giro máximo es $1.500.000 COP')
      )
      const err = await build()
        .quoteEfecty({ ...efectyInput, amount: 2000000 })
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toEqual({ amount: 'El giro máximo es $1.500.000 COP' })
    })

    it('maps a 422 about the document to errors.recipientDocument', async (): Promise<void> => {
      efectyQuote.mockRejectedValue(new HttpError(422, 'Cédula inválida'))
      const err = await build()
        .quoteEfecty(efectyInput)
        .catch((e) => e)
      expect(err.errors).toEqual({ recipientDocument: 'Cédula inválida' })
    })

    it('falls back to a local simulated quote when unavailable', async (): Promise<void> => {
      efectyQuote.mockRejectedValue(new IntegrationUnavailable())
      const quote = await build().quoteEfecty(efectyInput)
      expect(quote).toMatchObject({
        fee: 0,
        total: 250000,
        simulated: true,
        minAmount: 10000,
        maxAmount: 1500000
      })
    })

    it('uses the local quote without a client and enforces the range', async (): Promise<void> => {
      const service = build(false)
      await expect(service.quoteEfecty(efectyInput)).resolves.toMatchObject({
        simulated: true
      })
      const err = await service
        .quoteEfecty({ ...efectyInput, amount: 5000 })
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toHaveProperty('amount')
    })
  })

  describe('resolveBreb', (): void => {
    it('maps the upstream resolution and caches it', async (): Promise<void> => {
      brebResolve.mockResolvedValue(upstreamKey)
      const service = build()
      const res = await service.resolveBreb('ana@correo.com')
      expect(res).toEqual({
        key: 'ana@correo.com',
        keyType: 'email',
        exists: true,
        holderName: 'An*** Pé***',
        bank: 'Banco Mock Bre-B',
        message: 'Llave Bre-B encontrada.',
        simulated: false
      })
      await service.resolveBreb('ana@correo.com')
      expect(brebResolve).toHaveBeenCalledTimes(1)
    })

    it('maps a 404 to errors.key', async (): Promise<void> => {
      brebResolve.mockRejectedValue(
        new HttpError(404, 'La llave Bre-B no existe o no está activa')
      )
      const err = await build()
        .resolveBreb('3001234560')
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toEqual({
        key: 'La llave Bre-B no existe o no está activa'
      })
    })

    it.each(['3001234567', 'ana@correo.com', 'ABC123b'])(
      'resolves %s locally when unavailable',
      async (key): Promise<void> => {
        brebResolve.mockRejectedValue(new IntegrationUnavailable())
        const res = await build().resolveBreb(key)
        expect(res).toMatchObject({ key, exists: true, simulated: true })
      }
    )

    it.each(['3001234560', 'llaveA', 'llavea'])(
      'rejects %s locally (ends in 0, A or a)',
      async (key): Promise<void> => {
        const err = await build(false)
          .resolveBreb(key)
          .catch((e) => e)
        expect(err).toBeInstanceOf(BadRequest)
        expect(err.errors).toHaveProperty('key')
      }
    )

    it('infers the key type locally', async (): Promise<void> => {
      const service = build(false)
      expect((await service.resolveBreb('3001234567')).keyType).toBe('phone')
      expect((await service.resolveBreb('a@b.co')).keyType).toBe('email')
      expect((await service.resolveBreb('1020304051')).keyType).toBe('document')
      expect((await service.resolveBreb('mi-llave')).keyType).toBe(
        'alphanumeric'
      )
    })
  })

  describe('priceMoneyItem', (): void => {
    it('charges amount + fee for efecty and stores the recipient', async (): Promise<void> => {
      efectyQuote.mockResolvedValue(upstreamQuote)
      const priced = await build().priceMoneyItem((await efectyItem()) as never)
      expect(priced.price).toBe(252000)
      expect(priced.quantity).toBe(1)
      expect(priced.details).toEqual({
        kind: 'efecty',
        recipientDocument: '1020304050',
        recipientName: 'Ana Pérez',
        recipientPhone: '3001234567',
        fee: 2000,
        total: 252000
      })
    })

    it('rejects an efecty amount out of range', async (): Promise<void> => {
      const err = await build()
        .priceMoneyItem((await efectyItem(2_000_000)) as never)
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toHaveProperty('amount')
      expect(efectyQuote).not.toHaveBeenCalled()
    })

    it('rejects a product of the wrong type', async (): Promise<void> => {
      const item = {
        ...(await brebItem('ana@correo.com')),
        kind: 'efecty'
      }
      const err = await build()
        .priceMoneyItem(item as never)
        .catch((e) => e)
      expect(err.errors).toHaveProperty('productId')
    })

    it('prices breb with the resolved key data', async (): Promise<void> => {
      brebResolve.mockResolvedValue(upstreamKey)
      const priced = await build().priceMoneyItem(
        (await brebItem('ana@correo.com')) as never
      )
      expect(priced.price).toBe(150000)
      expect(priced.details).toEqual({
        kind: 'breb',
        key: 'ana@correo.com',
        keyType: 'email',
        holderName: 'An*** Pé***',
        bank: 'Banco Mock Bre-B',
        description: 'Arriendo'
      })
    })

    it('rejects a breb key that does not exist', async (): Promise<void> => {
      const err = await build(false)
        .priceMoneyItem((await brebItem('3001234560')) as never)
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequest)
      expect(err.errors).toHaveProperty('key')
    })

    it('rejects a breb amount out of range', async (): Promise<void> => {
      const err = await build(false)
        .priceMoneyItem((await brebItem('ana@correo.com', 6_000_000)) as never)
        .catch((e) => e)
      expect(err.errors).toHaveProperty('amount')
    })
  })
})
