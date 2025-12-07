import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop analytics-related indexes from existing tables
  await knex.schema.alterTable('deliveries', (table) => {
    table.dropIndex(['delivery_personnel_id', 'delivered_at']);
    table.dropIndex(['delivered_at']);
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['created_at']);
  });

  await knex.schema.alterTable('orders', (table) => {
    table.dropIndex(['delivered_at']);
    table.dropIndex(['confirmed_at']);
    table.dropIndex(['status', 'created_at']);
  });

  // Drop aggregated_metrics table
  await knex.schema.dropTableIfExists('aggregated_metrics');
}

export async function down(knex: Knex): Promise<void> {
  // Recreate aggregated_metrics table
  await knex.schema.createTable('aggregated_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('metric_type', 50).notNullable();
    table.string('period', 20).notNullable();
    table.timestamp('period_start').notNullable();
    table.timestamp('period_end').notNullable();
    table.jsonb('data').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['metric_type', 'period', 'period_start']);
    table.index(['period_start', 'period_end']);
  });

  // Recreate indexes on existing tables
  await knex.schema.alterTable('orders', (table) => {
    table.index(['status', 'created_at']);
    table.index(['confirmed_at']);
    table.index(['delivered_at']);
  });

  await knex.schema.alterTable('users', (table) => {
    table.index(['created_at']);
  });

  await knex.schema.alterTable('deliveries', (table) => {
    table.index(['delivered_at']);
    table.index(['delivery_personnel_id', 'delivered_at']);
  });
}
