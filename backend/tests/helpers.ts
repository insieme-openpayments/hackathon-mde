import { Product } from '@/product/model'
import { type PartialModelObject } from 'objection'
import { type Knex } from 'knex'
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
