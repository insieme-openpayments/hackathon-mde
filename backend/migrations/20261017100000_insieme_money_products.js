const MONEY_PRODUCTS = [
  {
    id: '5b0c1d6e-3f1a-4a52-9c1e-7a4d2e8b9f01',
    type: 'giro',
    slug: 'efecty',
    name: 'Giro Efecty',
    minAmount: 10000,
    maxAmount: 1500000,
    metadata: { enabled: true, provider: 'mock' }
  },
  {
    id: '8e2f4a9b-6c3d-4b7e-a15f-0d9c3b6e7a02',
    type: 'transferencia',
    slug: 'breb',
    name: 'Transferencia Bre-B',
    minAmount: 1000,
    maxAmount: 5000000,
    metadata: { enabled: true, provider: 'mock' }
  }
]

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const now = new Date().toISOString()
  await knex('products')
    .insert(
      MONEY_PRODUCTS.map((p) => ({
        ...p,
        metadata: JSON.stringify(p.metadata),
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

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex('products')
    .whereIn(
      'slug',
      MONEY_PRODUCTS.map((p) => p.slug)
    )
    .del()
}
