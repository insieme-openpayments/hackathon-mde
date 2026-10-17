import { createContainer, type Cradle } from '@/container'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { AwilixContainer } from 'awilix'
import { truncateTables } from '@/tests/tables'
import { api, registerUser } from '@/tests/helpers'
import { User } from '@/user/model'
import { Session } from '@/auth/session-model'

describe('Auth Controller', (): void => {
  let container: AwilixContainer<Cradle>
  let app: TestApp

  const body = {
    name: 'Ana Pérez',
    document: '1.000.123.456',
    email: 'Ana@Correo.com',
    phone: '300 123 4567',
    password: 'secreto-123',
    passwordConfirm: 'secreto-123'
  }

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

  it('registers (201) without exposing the password hash', async (): Promise<void> => {
    const res = await api(app.port, 'POST', '/auth/register', { body })
    expect(res.status).toBe(201)
    const { token, user } = res.json.result
    expect(token).toEqual(expect.any(String))
    expect(user).toMatchObject({
      name: 'Ana Pérez',
      document: '1000123456',
      email: 'ana@correo.com',
      phone: '3001234567'
    })
    expect(JSON.stringify(res.json)).not.toMatch(/passwordHash|scrypt|secreto/)

    const row = await User.query().findById(user.id)
    expect(row?.passwordHash).toMatch(/^scrypt\$/)
    // Only the sha256 of the token is stored.
    const sessions = await Session.query()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].tokenHash).not.toBe(token)
    expect(sessions[0].tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns 409 with errors.email for a duplicate email (case-insensitive)', async (): Promise<void> => {
    await api(app.port, 'POST', '/auth/register', { body })
    const res = await api(app.port, 'POST', '/auth/register', {
      body: { ...body, email: 'ANA@correo.com' }
    })
    expect(res.status).toBe(409)
    expect(res.json.errors.email).toBe('Ya existe una cuenta con este correo')
  })

  it('returns 400 errors.passwordConfirm when passwords differ', async (): Promise<void> => {
    const res = await api(app.port, 'POST', '/auth/register', {
      body: { ...body, passwordConfirm: 'otra-cosa-123' }
    })
    expect(res.status).toBe(400)
    expect(res.json.errors).toHaveProperty('passwordConfirm')
  })

  it('returns 400 for short passwords and malformed fields', async (): Promise<void> => {
    const res = await api(app.port, 'POST', '/auth/register', {
      body: {
        ...body,
        password: 'corta',
        passwordConfirm: 'corta',
        email: 'no-es-correo',
        phone: 'abc'
      }
    })
    expect(res.status).toBe(400)
    expect(Object.keys(res.json.errors)).toEqual(
      expect.arrayContaining(['password', 'email', 'phone'])
    )
  })

  it('logs in (200) with the right credentials', async (): Promise<void> => {
    await api(app.port, 'POST', '/auth/register', { body })
    const res = await api(app.port, 'POST', '/auth/login', {
      body: { email: 'ana@correo.com', password: 'secreto-123' }
    })
    expect(res.status).toBe(200)
    expect(res.json.result.token).toEqual(expect.any(String))
    expect(res.json.result.user.email).toBe('ana@correo.com')
  })

  it('returns 401 with errors.password for a wrong password or unknown email', async (): Promise<void> => {
    await api(app.port, 'POST', '/auth/register', { body })
    for (const creds of [
      { email: 'ana@correo.com', password: 'incorrecta-123' },
      { email: 'nadie@correo.com', password: 'secreto-123' }
    ]) {
      const res = await api(app.port, 'POST', '/auth/login', { body: creds })
      expect(res.status).toBe(401)
      expect(res.json.message).toBe('Correo o contraseña incorrectos')
      expect(res.json.errors).toHaveProperty('password')
    }
  })

  it('GET /me requires a token and returns the user without grant tokens', async (): Promise<void> => {
    expect((await api(app.port, 'GET', '/me')).status).toBe(401)
    const { token, user } = await registerUser(container)
    const res = await api(app.port, 'GET', '/me', { token })
    expect(res.status).toBe(200)
    expect(res.json.result).toEqual({ user, grant: null })
  })

  it('rejects an invented token with 401', async (): Promise<void> => {
    const res = await api(app.port, 'GET', '/me', {
      token: 'inventado-0123456789'
    })
    expect(res.status).toBe(401)
  })

  it('logout invalidates the token', async (): Promise<void> => {
    const { token } = await registerUser(container)
    expect((await api(app.port, 'GET', '/me', { token })).status).toBe(200)
    expect(
      (await api(app.port, 'POST', '/auth/logout', { token })).status
    ).toBe(200)
    expect((await api(app.port, 'GET', '/me', { token })).status).toBe(401)
    expect((await api(app.port, 'POST', '/auth/logout')).status).toBe(401)
  })

  it('rejects an expired session', async (): Promise<void> => {
    const { token } = await registerUser(container)
    await Session.query().patch({ expiresAt: new Date(Date.now() - 1000) })
    expect((await api(app.port, 'GET', '/me', { token })).status).toBe(401)
  })

  it('DELETE /me/grant removes the stored grant', async (): Promise<void> => {
    const { token, user } = await registerUser(container)
    const revokeSpy = jest
      .spyOn(container.resolve('openPayments'), 'revokeToken')
      .mockResolvedValue(undefined)
    await container.resolve('userService').setGrant(user.id, {
      accessToken: 'a',
      manageUrl: 'https://auth.example.com/t/1',
      walletAddressUrl: 'https://ilp.example.com/alice',
      createdAt: new Date().toISOString()
    })
    const me = await api(app.port, 'GET', '/me', { token })
    expect(me.json.result.grant.walletAddressUrl).toBe(
      'https://ilp.example.com/alice'
    )
    expect(JSON.stringify(me.json)).not.toMatch(/accessToken|manageUrl/)
    expect((await api(app.port, 'DELETE', '/me/grant', { token })).status).toBe(
      200
    )
    expect(
      (await api(app.port, 'GET', '/me', { token })).json.result.grant
    ).toBe(null)
    expect(revokeSpy).toHaveBeenCalledWith({
      accessToken: 'a',
      manageUrl: 'https://auth.example.com/t/1'
    })
  })
})
