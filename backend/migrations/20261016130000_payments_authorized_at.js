/**
 * Marks the moment the payer's interaction callback was consumed, so a
 * replayed PATCH /orders/:id is idempotent.
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('payments', function (table) {
    table.timestamp('authorizedAt').nullable()
  })
}

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('payments', function (table) {
    table.dropColumn('authorizedAt')
  })
}
