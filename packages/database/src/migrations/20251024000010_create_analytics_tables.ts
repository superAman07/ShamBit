import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create aggregated_metrics table for pre-calculated analytics
  await knex.schema.createTable('aggregated_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('metric_type', 50).notNullable(); // 'sales', 'customers', 'delivery'
    table.string('period', 20).notNullable(); // 'daily', 'weekly', 'monthly'
    table.timestamp('period_start').notNullable();
    table.timestamp('period_end').notNullable();
    table.jsonb('data').notNullable(); // Stores the calculated metrics
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for efficient querying
    table.index(['metric_type', 'period', 'period_start']);
    table.index(['period_start', 'period_end']);
  });

  // Create indexes on existing tables to optimize analytics queries
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

export async function down(knex: Knex): Promise<void> {
  // Drop indexes from existing tables
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
