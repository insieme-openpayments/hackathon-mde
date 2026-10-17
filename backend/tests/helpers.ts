import { Product } from '@/product/model'
import { type PartialModelObject } from 'objection'
import { type Knex } from 'knex'
import type { AwilixContainer } from 'awilix'
import type { AccountUser } from '@insieme/shared'
import type { Cradle } from '@/container'
import catalog from '../data/catalog.json'

export async function createProducts(args: PartialModelObject<Product>[]) {
  await Product.query().insert(args)
}

/** Inserts the 12 categories and 36 products from backend/data/catalog.json */
export async function seedCatalog(knex: Knex): Promise<void> {
  const now = new Date().toISOString()
  // Idempotent: the migrations already seed the same rows on a fresh database
  await knex('products').del()
  await knex('categories').del()
  await knex('categories').insert(
    catalog.categories.map((c) => ({ ...c, createdAt: now, updatedAt: now }))
  )
  await knex('products').insert(
    catalog.products.map((p) => ({
      ...p,
      metadata: JSON.stringify(p.metadata),
      description: null,
      image: null,
      imageDark: null,
      price: 0,
      createdAt: now,
      updatedAt: now
    }))
  )
}

/** Inserts the synthetic money products (Giro Efecty, Transferencia Bre-B). Idempotent. */
export async function seedMoneyProducts(knex: Knex): Promise<void> {
  const now = new Date().toISOString()
  await knex('products')
    .insert(
      [
        {
          id: '5b0c1d6e-3f1a-4a52-9c1e-7a4d2e8b9f01',
          type: 'giro',
          slug: 'efecty',
          name: 'Giro Efecty',
          minAmount: 10000,
          maxAmount: 1500000,
          metadata: JSON.stringify({ enabled: true, provider: 'mock' })
        },
        {
          id: '8e2f4a9b-6c3d-4b7e-a15f-0d9c3b6e7a02',
          type: 'transferencia',
          slug: 'breb',
          name: 'Transferencia Bre-B',
          minAmount: 1000,
          maxAmount: 5000000,
          metadata: JSON.stringify({ enabled: true, provider: 'mock' })
        }
      ].map((p) => ({
        ...p,
        category: null,
        requiresManualAmount: true,
        fixedAmount: null,
        logo: null,
        sortOrder: 0,
        description: null,
        image: null,
        imageDark: null,
        price: 0,
        createdAt: now,
        updatedAt: now
      }))
    )
    .onConflict('slug')
    .ignore()
}

let userSeq = 0

/** Registers an account through AuthService and returns its session token. */
export async function registerUser(
  container: AwilixContainer<Cradle>,
  overrides: Partial<{
    name: string
    document: string
    email: string
    phone: string
    password: string
  }> = {}
): Promise<{ token: string; user: AccountUser }> {
  userSeq += 1
  return await container.resolve('authService').register({
    name: 'Ana Pérez',
    document: `1000${String(userSeq).padStart(6, '0')}`,
    email: `ana${userSeq}@correo.com`,
    phone: '3001234567',
    password: 'secreto-123',
    ...overrides
  })
}

/** Minimal HTTP helper against the test server (exercises real middleware). */
export async function api(
  port: number,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ status: number; json: any }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {})
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
  })
  return { status: res.status, json: await res.json().catch(() => null) }
}
