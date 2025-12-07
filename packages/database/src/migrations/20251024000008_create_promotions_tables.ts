import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create promotions table
  await knex.schema.createTable('promotions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).unique().notNullable();
    table.text('description');
    table.string('discount_type', 20).notNullable(); // 'percentage' or 'fixed'
    table.integer('discount_value').notNullable(); // Percentage (0-100) or amount in paise
    table.integer('min_order_value'); // Minimum order value in paise
    table.integer('max_discount_amount'); // Cap for percentage discounts in paise
    table.integer('usage_limit'); // Total usage limit
    table.integer('usage_count').defaultTo(0).notNullable(); // Current usage count
    table.integer('per_user_limit'); // Usage limit per user
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.uuid('created_by'); // Admin ID
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('code');
    table.index('is_active');
    table.index(['start_date', 'end_date']);
  });

  // Create promotion_usage table
  await knex.schema.createTable('promotion_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('promotion_id').notNullable().references('id').inTable('promotions').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.integer('discount_amount').notNullable(); // Actual discount applied in paise
    table.timestamp('used_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('promotion_id');
    table.index('user_id');
    table.index('order_id');
    table.index(['promotion_id', 'user_id']); // For checking per-user limits
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('promotion_usage');
  await knex.schema.dropTableIfExists('promotions');
}
