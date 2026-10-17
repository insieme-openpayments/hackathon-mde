import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import {
  api,
  registerUser,
  seedCatalog,
  seedMoneyProducts
} from '@/tests/helpers'

describe('Saved bills', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let productId: string
  let moneyProductId: string

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await app.knex.destroy()
  })

  beforeEach(async (): Promise<void> => {
    await truncateTables(app.knex)
    await seedCatalog(app.knex)
    await seedMoneyProducts(app.knex)
    const productService = container.resolve('productService')
    productId = (await productService.getBySlug('vanti')).id
    moneyProductId = (await productService.getBySlug('efecty')).id
  })

  it('requires authentication', async (): Promise<void> => {
    expect((await api(app.port, 'GET', '/me/bills')).status).toBe(401)
    expect(
      (await api(app.port, 'POST', '/me/bills', { body: {} })).status
    ).toBe(401)
  })

  it('supports create, list, update and delete', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const created = await api(app.port, 'POST', '/me/bills', {
      token,
      body: { productId, name: 'Gas casa', ref1: '1234567' }
    })
    expect(created.status).toBe(201)
    const bill = created.json.result
    expect(bill).toMatchObject({
      productId,
      name: 'Gas casa',
      ref1: '1234567',
      ref2: null,
      lastAmount: null,
      lastPaidAt: null
    })

    const list = await api(app.port, 'GET', '/me/bills', { token })
    expect(list.json.result).toHaveLength(1)

    const paidAt = new Date().toISOString()
    const patched = await api(app.port, 'PATCH', `/me/bills/${bill.id}`, {
      token,
      body: { lastAmount: 18000, lastPaidAt: paidAt, name: 'Gas apto' }
    })
    expect(patched.status).toBe(200)
    expect(patched.json.result).toMatchObject({
      name: 'Gas apto',
      lastAmount: 18000,
      lastPaidAt: paidAt
    })

    const del = await api(app.port, 'DELETE', `/me/bills/${bill.id}`, { token })
    expect(del.status).toBe(200)
    expect(
      (await api(app.port, 'GET', '/me/bills', { token })).json.result
    ).toEqual([])
  })

  it('upserts by (productId, ref1) returning 200 with the updated record', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const first = await api(app.port, 'POST', '/me/bills', {
      token,
      body: { productId, name: 'Gas casa', ref1: '1234567' }
    })
    const second = await api(app.port, 'POST', '/me/bills', {
      token,
      body: { productId, name: 'Gas nuevo', ref1: '1234567', ref2: '99' }
    })
    expect(second.status).toBe(200)
    expect(second.json.result.id).toBe(first.json.result.id)
    expect(second.json.result).toMatchObject({ name: 'Gas nuevo', ref2: '99' })
    expect(
      (await api(app.port, 'GET', '/me/bills', { token })).json.result
    ).toHaveLength(1)
  })

  it('validates input and the product type', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const bad = await api(app.port, 'POST', '/me/bills', {
      token,
      body: { productId, name: 'x', ref1: '12ab' }
    })
    expect(bad.status).toBe(400)
    expect(bad.json.errors).toHaveProperty('name')
    expect(bad.json.errors).toHaveProperty('ref1')

    const money = await api(app.port, 'POST', '/me/bills', {
      token,
      body: { productId: moneyProductId, name: 'Giro', ref1: '1234567' }
    })
    expect(money.status).toBe(400)
    expect(money.json.errors).toHaveProperty('productId')
  })

  it('isolates bills between users (404, empty list)', async (): Promise<void> => {
    const a = await registerUser(container)
    const b = await registerUser(container)
    const created = await api(app.port, 'POST', '/me/bills', {
      token: a.token,
      body: { productId, name: 'Gas casa', ref1: '1234567' }
    })
    const id = created.json.result.id

    expect(
      (await api(app.port, 'GET', '/me/bills', { token: b.token })).json.result
    ).toEqual([])
    const patch = await api(app.port, 'PATCH', `/me/bills/${id}`, {
      token: b.token,
      body: { name: 'Robada' }
    })
    expect(patch.status).toBe(404)
    const del = await api(app.port, 'DELETE', `/me/bills/${id}`, {
      token: b.token
    })
    expect(del.status).toBe(404)
    expect(
      (
        await api(app.port, 'DELETE', '/me/bills/no-es-uuid', {
          token: b.token
        })
      ).status
    ).toBe(404)

    const still = await api(app.port, 'GET', '/me/bills', { token: a.token })
    expect(still.json.result).toHaveLength(1)
    expect(still.json.result[0].name).toBe('Gas casa')

    // B can save the very same reference independently.
    const mine = await api(app.port, 'POST', '/me/bills', {
      token: b.token,
      body: { productId, name: 'Gas B', ref1: '1234567' }
    })
    expect(mine.status).toBe(201)
  })
})
