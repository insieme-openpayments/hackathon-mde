const catalog = require('../data/catalog.json')

const VIRTUE_PRODUCT_IDS = [
  '84af033c-00eb-4cde-b5ec-f18cf7adaea2',
  '040b7be3-3d51-4271-94ff-53f5c249e244',
  '7c302c62-dbfe-4b57-a7d1-e3b9cdb762b3',
  'ad3b7c70-fb28-4c1c-99ea-4028feac3421',
  'f23fd439-b2c0-481d-b350-373abd3923dd',
  '5f3aafc7-b105-49c5-9db1-cf41f61dd912'
]

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const now = new Date().toISOString()

  await knex('products').whereIn('id', VIRTUE_PRODUCT_IDS).del()

  await knex('categories')
    .insert(
      catalog.categories.map((c) => ({ ...c, createdAt: now, updatedAt: now }))
    )
    .onConflict('id')
    .ignore()

  await knex('products')
    .insert(
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
      catalog.products.map((p) => p.slug)
    )
    .del()
  await knex('categories')
    .whereIn(
      'id',
      catalog.categories.map((c) => c.id)
    )
    .del()
}
