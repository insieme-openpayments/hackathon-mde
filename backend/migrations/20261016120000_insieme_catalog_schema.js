/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('products', (table) => {
    table.string('type').notNullable().defaultTo('servicio')
    table.string('category')
    table.boolean('requiresManualAmount').notNullable().defaultTo(false)
    table.integer('minAmount')
    table.integer('maxAmount')
    table.integer('fixedAmount')
    table.string('logo')
    table.integer('sortOrder').notNullable().defaultTo(0)
    table.jsonb('metadata')
    table.index(['type', 'category'])
  })
  await knex.raw(
    'ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL'
  )
  await knex.raw('ALTER TABLE "products" ALTER COLUMN "image" DROP NOT NULL')
  await knex.raw(
    'ALTER TABLE "products" ALTER COLUMN "imageDark" DROP NOT NULL'
  )

  await knex.schema.createTable('categories', (table) => {
    table.string('id').primary()
    table.string('label').notNullable()
    table.string('icon')
    table.integer('sortOrder').notNullable().defaultTo(0)
    table.timestamp('createdAt').notNullable()
    table.timestamp('updatedAt').notNullable()
  })

  await knex.schema.alterTable('orderItems', (table) => {
    table.jsonb('details')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('orderItems', (table) => {
    table.dropColumn('details')
  })
  await knex.schema.dropTable('categories')
  await knex.schema.alterTable('products', (table) => {
    table.dropIndex(['type', 'category'])
    table.dropColumns(
      'type',
      'category',
      'requiresManualAmount',
      'minAmount',
      'maxAmount',
      'fixedAmount',
      'logo',
      'sortOrder',
      'metadata'
    )
  })
}
