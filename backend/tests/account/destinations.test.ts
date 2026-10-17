import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { api, registerUser } from '@/tests/helpers'

describe('Saved destinations', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp

  const efecty = (extra: Record<string, unknown> = {}) => ({
    kind: 'efecty',
    details: {
      recipientDocument: '1.000.123.456',
      recipientName: 'María Gómez'
    },
    lastAmount: 50000,
    ...extra
  })
  const breb = (extra: Record<string, unknown> = {}) => ({
    kind: 'breb',
    details: {
      key: ' Ana@Correo.com ',
      keyType: 'email',
      holderName: 'Ana P.'
    },
    lastAmount: 20000,
    ...extra
  })

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
  })

  it('requires authentication', async (): Promise<void> => {
    expect((await api(app.port, 'GET', '/me/destinations')).status).toBe(401)
  })

  it('saves efecty and breb destinations with a default label', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const e = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty()
    })
    expect(e.status).toBe(200)
    expect(e.json.result).toMatchObject({
      kind: 'efecty',
      label: 'María Gómez',
      lastAmount: 50000,
      details: { recipientDocument: '1000123456', recipientName: 'María Gómez' }
    })
    expect(e.json.result.lastUsedAt).toEqual(expect.any(String))

    const b = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: breb()
    })
    expect(b.json.result).toMatchObject({ kind: 'breb', label: 'Ana P.' })

    const list = await api(app.port, 'GET', '/me/destinations', { token })
    expect(list.json.result).toHaveLength(2)
  })

  it('upserts by identity without duplicating and updates label/lastAmount', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const first = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty()
    })
    const second = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty({ label: 'Mamá', lastAmount: 75000 })
    })
    expect(second.json.result.id).toBe(first.json.result.id)
    expect(second.json.result).toMatchObject({
      label: 'Mamá',
      lastAmount: 75000
    })

    // breb identity is the trimmed, lower-cased key
    const b1 = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: breb()
    })
    const b2 = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: breb({ details: { key: 'ANA@correo.com' }, lastAmount: 30000 })
    })
    expect(b2.json.result.id).toBe(b1.json.result.id)
    expect(b2.json.result.lastAmount).toBe(30000)
    // details are merged: omitted fields from the earlier save are kept
    expect(b2.json.result.details).toMatchObject({
      key: 'ANA@correo.com',
      keyType: 'email',
      holderName: 'Ana P.'
    })

    const list = await api(app.port, 'GET', '/me/destinations', { token })
    expect(list.json.result).toHaveLength(2)
  })

  it('keeps recipientPhone when an efecty destination is re-saved without it', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const first = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty({
        details: {
          recipientDocument: '1.000.123.456',
          recipientName: 'María Gómez',
          recipientPhone: '3109876543'
        }
      })
    })
    expect(first.json.result.details).toMatchObject({
      recipientPhone: '3109876543'
    })
    const second = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty({ lastAmount: 60000 })
    })
    expect(second.json.result.id).toBe(first.json.result.id)
    expect(second.json.result.lastAmount).toBe(60000)
    expect(second.json.result.details).toMatchObject({
      recipientPhone: '3109876543',
      recipientName: 'María Gómez'
    })
  })

  it('updates label, lastAmount and lastUsedAt, and deletes', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const saved = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: efecty()
    })
    const id = saved.json.result.id
    const used = '2026-01-02T03:04:05.000Z'
    const patched = await api(app.port, 'PATCH', `/me/destinations/${id}`, {
      token,
      body: { label: 'Tía', lastAmount: 12000, lastUsedAt: used }
    })
    expect(patched.status).toBe(200)
    expect(patched.json.result).toMatchObject({
      label: 'Tía',
      lastAmount: 12000,
      lastUsedAt: used
    })
    expect(
      (await api(app.port, 'DELETE', `/me/destinations/${id}`, { token }))
        .status
    ).toBe(200)
    expect(
      (await api(app.port, 'GET', '/me/destinations', { token })).json.result
    ).toEqual([])
  })

  it('validates the payload by kind', async (): Promise<void> => {
    const { token } = await registerUser(container)
    const unknownKind = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: { kind: 'otro', details: {} }
    })
    expect(unknownKind.status).toBe(400)

    const badEfecty = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: { kind: 'efecty', details: { key: 'ana@correo.com' } }
    })
    expect(badEfecty.status).toBe(400)
    expect(badEfecty.json.errors).toHaveProperty(['details.recipientDocument'])

    const badBreb = await api(app.port, 'POST', '/me/destinations', {
      token,
      body: { kind: 'breb', details: { recipientDocument: '123456' } }
    })
    expect(badBreb.status).toBe(400)
    expect(badBreb.json.errors).toHaveProperty(['details.key'])
  })

  it('isolates destinations between users', async (): Promise<void> => {
    const a = await registerUser(container)
    const b = await registerUser(container)
    const saved = await api(app.port, 'POST', '/me/destinations', {
      token: a.token,
      body: efecty()
    })
    const id = saved.json.result.id

    expect(
      (await api(app.port, 'GET', '/me/destinations', { token: b.token })).json
        .result
    ).toEqual([])
    expect(
      (
        await api(app.port, 'PATCH', `/me/destinations/${id}`, {
          token: b.token,
          body: { label: 'Robado' }
        })
      ).status
    ).toBe(404)
    expect(
      (
        await api(app.port, 'DELETE', `/me/destinations/${id}`, {
          token: b.token
        })
      ).status
    ).toBe(404)

    // Same identity saved by B is a separate record.
    const mine = await api(app.port, 'POST', '/me/destinations', {
      token: b.token,
      body: efecty()
    })
    expect(mine.json.result.id).not.toBe(id)
    const still = await api(app.port, 'GET', '/me/destinations', {
      token: a.token
    })
    expect(still.json.result).toHaveLength(1)
  })
})
