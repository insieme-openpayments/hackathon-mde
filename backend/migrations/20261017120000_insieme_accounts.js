/**
 * Cuenta Insieme (opcional): datos de usuario, sesiones, facturas guardadas,
 * destinos guardados y grant de pago en un clic guardado en la cuenta.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(
    'ALTER TABLE "users" ALTER COLUMN "walletAddress" DROP NOT NULL'
  )
  await knex.schema.alterTable('users', (table) => {
    table.string('name')
    table.string('document')
    table.string('email')
    table.string('phone')
    table.string('passwordHash')
    table.jsonb('oneClickGrant')
  })
  await knex.raw(
    'CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" (lower("email")) WHERE "email" IS NOT NULL'
  )

  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table
      .uuid('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table.string('tokenHash').notNullable().unique()
    table.timestamp('expiresAt').notNullable()
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
    table.index(['userId'])
  })

  await knex.schema.createTable('savedBills', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table
      .uuid('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table.uuid('productId').notNullable().references('id').inTable('products')
    table.string('name').notNullable()
    table.string('ref1').notNullable()
    table.string('ref2')
    table.integer('lastAmount')
    table.timestamp('lastPaidAt')
    table.timestamp('createdAt').notNullable()
    table.timestamp('updatedAt').notNullable()
    table.unique(['userId', 'productId', 'ref1'])
  })

  await knex.schema.createTable('savedDestinations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table
      .uuid('userId')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table.string('kind').notNullable()
    table.string('identity').notNullable()
    table.string('label').notNullable()
    table.jsonb('details').notNullable()
    table.integer('lastAmount')
    table.timestamp('lastUsedAt')
    table.timestamp('createdAt').notNullable()
    table.timestamp('updatedAt').notNullable()
    table.unique(['userId', 'kind', 'identity'])
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable('savedDestinations')
  await knex.schema.dropTable('savedBills')
  await knex.schema.dropTable('sessions')
  await knex.raw('DROP INDEX IF EXISTS "users_email_lower_unique"')
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('oneClickGrant')
    table.dropColumn('passwordHash')
    table.dropColumn('phone')
    table.dropColumn('email')
    table.dropColumn('document')
    table.dropColumn('name')
  })
  // Cuentas sin billetera no caben en la columna NOT NULL: se les da un valor
  // placeholder en lugar de borrar sus órdenes.
  await knex.raw(
    `UPDATE "users" SET "walletAddress" = 'removed:' || "id" WHERE "walletAddress" IS NULL`
  )
  await knex.raw(
    'ALTER TABLE "users" ALTER COLUMN "walletAddress" SET NOT NULL'
  )
}
