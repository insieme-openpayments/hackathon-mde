import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { seedCatalog, seedMoneyProducts } from '@/tests/helpers'
import { CatalogSyncService } from '@/catalog/sync'
import { Product } from '@/product/model'
import { Category } from '@/category/model'
import type {
  IIntegrationClient,
  IntegrationCatalog
} from '@/integration/client'
import type { Logger } from 'winston'

const upstream = (): IntegrationCatalog => ({
  currency: 'COP',
  min_payment: 2000,
  reference: { min_length: 6, max_length: 20 },
  categories: [
    { id: 'gas', label: 'Gas domiciliario' },
    { id: 'nueva', label: 'Categoría nueva' }
  ],
  companies: [
    {
      id: 'vanti',
      name: 'Vanti Renombrada',
      category: 'gas',
      logo_key: 'vanti',
      partial: false,
      fixed_amount: null
    },
    {
      id: 'enel',
      name: 'Enel Colombia',
      category: 'energia',
      logo_key: null,
      partial: true,
      fixed_amount: null
    },
    {
      id: 'nuevo-convenio',
      name: 'Nuevo Convenio',
      category: 'nueva',
      logo_key: null,
      partial: true,
      fixed_amount: 5000
    }
  ]
})

describe('Catalog sync', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let logger: Logger

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
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
  })

  it('upserts products and categories without deleting rows', async (): Promise<void> => {
    const client = {
      getCatalog: jest.fn().mockResolvedValue(upstream()),
      validateService: jest.fn(),
      getProducts: jest.fn().mockResolvedValue({ products: [] })
    } as unknown as IIntegrationClient
    const service = new CatalogSyncService(logger, client)
    expect(service.getStatus()).toEqual({
      catalogSource: 'local',
      lastSyncAt: null
    })

    await expect(service.sync()).resolves.toBe(true)

    const vanti = await Product.query().where('slug', 'vanti').first()
    expect(vanti).toMatchObject({
      name: 'Vanti Renombrada',
      requiresManualAmount: false,
      minAmount: 2000,
      logo: 'convenios/logo-vanti.png'
    })
    expect(vanti?.metadata).toMatchObject({
      logoFit: 'vanti',
      logoKey: 'vanti'
    })
    const enel = await Product.query().where('slug', 'enel').first()
    expect(enel?.requiresManualAmount).toBe(true)

    const created = await Product.query()
      .where('slug', 'nuevo-convenio')
      .first()
    expect(created).toMatchObject({
      type: 'servicio',
      category: 'nueva',
      fixedAmount: 5000,
      requiresManualAmount: true
    })

    expect(await Product.query().resultSize()).toBe(39)
    expect(await Category.query().resultSize()).toBe(13)
    const gas = await Category.query().findById('gas')
    expect(gas).toMatchObject({
      label: 'Gas domiciliario',
      icon: 'assets/servicios/cat-gas.svg',
      sortOrder: 3
    })

    expect(service.getStatus().catalogSource).toBe('integration-backend')
    expect(service.getStatus().lastSyncAt).toEqual(expect.any(String))
  })

  it('marks products missing upstream as inactive and keeps the rows', async (): Promise<void> => {
    const client = {
      getCatalog: jest.fn().mockResolvedValue(upstream()),
      validateService: jest.fn(),
      getProducts: jest.fn().mockResolvedValue({ products: [] })
    } as unknown as IIntegrationClient
    await new CatalogSyncService(logger, client).sync()

    const vanti = await Product.query().where('slug', 'vanti').first()
    expect(vanti?.metadata?.active).toBe(true)
    const absent = await Product.query().where('type', 'servicio')
    const inactive = absent.filter((p) => p.metadata?.active === false)
    expect(inactive.length).toBe(34)
    const efecty = await Product.query().where('slug', 'efecty').first()
    expect(efecty?.metadata?.active).toBeUndefined()

    const listed = await container.resolve('productService').list()
    expect(listed.some((p) => p.slug === 'vanti')).toBe(true)
    expect(listed.some((p) => p.metadata?.active === false)).toBe(false)
    expect(listed.some((p) => p.slug === 'efecty')).toBe(true)
  })

  it('syncs enabled/provider and limits of the money products', async (): Promise<void> => {
    const client = {
      getCatalog: jest.fn().mockResolvedValue(upstream()),
      validateService: jest.fn(),
      getProducts: jest.fn().mockResolvedValue({
        products: [
          { id: 'services', enabled: true, provider: 'dummy' },
          {
            id: 'efecty',
            enabled: false,
            provider: 'real',
            min_amount: 20000,
            max_amount: 900000
          }
        ]
      })
    } as unknown as IIntegrationClient
    await new CatalogSyncService(logger, client).sync()

    const efecty = await Product.query().where('slug', 'efecty').first()
    expect(efecty).toMatchObject({ minAmount: 20000, maxAmount: 900000 })
    expect(efecty?.metadata).toMatchObject({ enabled: false, provider: 'real' })
    expect(await Product.query().where('slug', 'services')).toHaveLength(0)
  })

  it('is a no-op when the client fails', async (): Promise<void> => {
    const client = {
      getCatalog: jest.fn().mockRejectedValue(new Error('boom')),
      validateService: jest.fn(),
      getProducts: jest.fn().mockResolvedValue({ products: [] })
    } as unknown as IIntegrationClient
    const service = new CatalogSyncService(logger, client)

    await expect(service.sync()).resolves.toBe(false)

    expect(await Product.query().resultSize()).toBe(38)
    expect((await Product.query().where('slug', 'vanti').first())?.name).toBe(
      'Vanti S.A. ESP'
    )
    expect(service.getStatus()).toEqual({
      catalogSource: 'local',
      lastSyncAt: null
    })
  })

  it('does nothing without an integration client', async (): Promise<void> => {
    const service = new CatalogSyncService(logger, null)
    await expect(service.sync()).resolves.toBe(false)
    expect(() => service.start()).not.toThrow()
  })
})
