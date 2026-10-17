import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { seedCatalog } from '@/tests/helpers'
import { createRequest, createResponse } from 'node-mocks-http'
import { NextFunction, Request, Response } from 'express'
import axios from 'axios'
import { IBillController } from '@/bill/controller'
import { IProductService } from '@/product/service'
import { simulateBill } from '@/bill/simulate'

describe('Bill Controller', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp
  let billController: IBillController
  let productService: IProductService

  const next = jest.fn() as unknown as NextFunction

  const call = async (body: Record<string, unknown>) => {
    const req = createRequest<Request>({ body })
    const res = createResponse<Response>()
    await billController.lookup(req, res, (err) => {
      next()
      app.errorHandler(err, req, res, next)
    })
    return res
  }

  beforeAll(async (): Promise<void> => {
    container = await createContainer(env)
    app = await createApp(container)
    billController = container.resolve('billController')
    productService = container.resolve('productService')
  })

  afterAll(async (): Promise<void> => {
    await app.stop()
    await app.knex.destroy()
  })

  beforeEach(async (): Promise<void> => {
    await truncateTables(app.knex)
    await seedCatalog(app.knex)
  })

  it('returns the bill with holder, concept and due date', async (): Promise<void> => {
    const vanti = await productService.getBySlug('vanti')
    const res = await call({ productId: vanti.id, ref1: '123456' })
    expect(res.statusCode).toBe(200)
    const { result } = res._getJSONData()
    expect(result).toMatchObject({
      productId: vanti.id,
      convenio: 'vanti',
      ref1: '123456',
      amount: simulateBill('vanti', '123456'),
      partial: true
    })
    expect(result.holder).toEqual(expect.any(String))
    expect(result.concept).toEqual(expect.any(String))
    expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns 400 with errors.ref1 for a reference of zeros', async (): Promise<void> => {
    const vanti = await productService.getBySlug('vanti')
    const res = await call({ productId: vanti.id, ref1: '000000' })
    expect(res.statusCode).toBe(400)
    expect(res._getJSONData()).toMatchObject({
      success: false,
      errors: {
        ref1: 'No encontramos una factura pendiente con esta referencia'
      }
    })
  })

  it('returns 400 for a malformed reference or product id', async (): Promise<void> => {
    const res = await call({ productId: 'nope', ref1: '12' })
    expect(res.statusCode).toBe(400)
    expect(Object.keys(res._getJSONData().errors).sort()).toEqual([
      'productId',
      'ref1'
    ])
  })

  it('returns 404 for an unknown product', async (): Promise<void> => {
    const res = await call({
      productId: '11111111-1111-4111-8111-111111111111',
      ref1: '123456'
    })
    expect(res.statusCode).toBe(404)
  })

  it('serves POST /bills/lookup over HTTP', async (): Promise<void> => {
    const vanti = await productService.getBySlug('vanti')
    const { data, status } = await axios.post(
      `http://localhost:${app.port}/bills/lookup`,
      { productId: vanti.id, ref1: '123456' }
    )
    expect(status).toBe(200)
    expect(data.result.amount).toBe(simulateBill('vanti', '123456'))

    const bad = await axios
      .post(`http://localhost:${app.port}/bills/lookup`, {
        productId: vanti.id,
        ref1: '000000'
      })
      .catch((e) => e.response)
    expect(bad.status).toBe(400)
    expect(bad.data.errors.ref1).toBeDefined()
  })
})
