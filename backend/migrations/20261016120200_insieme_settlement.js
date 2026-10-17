const OLD_STATUSES = ['PROCESSING', 'FAILED', 'COMPLETED', 'REJECTED']
const NEW_STATUSES = [...OLD_STATUSES, 'SETTLED', 'SETTLEMENT_FAILED']

const setStatusCheck = (knex, statuses) =>
  knex.raw(
    `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_status_check";
     ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ("status" IN (${statuses
       .map((s) => `'${s}'`)
       .join(', ')}))`
  )

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await setStatusCheck(knex, NEW_STATUSES)

  await knex.schema.alterTable('orders', (table) => {
    table.jsonb('events').notNullable().defaultTo('[]')
  })

  await knex.schema.createTable('settlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('orderId').notNullable().unique()
    table.foreign('orderId').references('orders.id').onDelete('CASCADE')
    table.string('idempotencyKey').notNullable().unique()
    table.string('provider')
    table.string('authCode')
    table.float('amount', 10, 2)
    table.timestamp('paidAt')
    table.jsonb('attempts').notNullable().defaultTo('[]')
    table.enum('status', ['SETTLED', 'FAILED']).notNullable()
    table.timestamp('createdAt').notNullable()
    table.timestamp('updatedAt').notNullable()
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable('settlements')
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('events')
  })
  await knex('orders')
    .whereIn('status', ['SETTLED', 'SETTLEMENT_FAILED'])
    .update({ status: 'COMPLETED' })
  await setStatusCheck(knex, OLD_STATUSES)
}
