import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create orders table
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('order_number', 50).unique().notNullable();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 30).notNullable();
    table.uuid('delivery_address_id').references('id').inTable('user_addresses');
    table.jsonb('delivery_address').notNullable();
    table.integer('subtotal').notNullable();
    table.integer('tax_amount').notNullable();
    table.integer('delivery_fee').notNullable();
    table.integer('discount_amount').defaultTo(0);
    table.integer('total_amount').notNullable();
    table.string('payment_method', 20).notNullable();
    table.string('payment_status', 20).notNullable();
    table.string('payment_id', 255);
    table.string('promo_code', 50);
    table.uuid('delivery_personnel_id');
    table.timestamp('estimated_delivery_time');
    table.timestamp('actual_delivery_time');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('confirmed_at');
    table.timestamp('delivered_at');
    table.timestamp('canceled_at');

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index(['created_at'], 'idx_orders_created_desc', {
      indexType: 'btree',
      storageEngineIndexType: 'btree',
    });
    table.index('order_number');
  });

  // Create order_items table
  await knex.schema.createTable('order_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products');
    table.string('product_name', 255).notNullable();
    table.string('product_image', 500);
    table.integer('unit_price').notNullable();
    table.integer('quantity').notNullable();
    table.integer('total_price').notNullable();

    // Index
    table.index('order_id');
  });

  // Create payment_reconciliation table for tracking discrepancies
  await knex.schema.createTable('payment_reconciliation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').references('id').inTable('orders');
    table.string('payment_gateway_id', 255).notNullable();
    table.integer('gateway_amount').notNullable();
    table.integer('internal_amount').notNullable();
    table.string('status', 30).notNullable(); // 'matched', 'discrepancy', 'resolved'
    table.text('notes');
    table.timestamp('reconciled_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    table.uuid('resolved_by');

    // Indexes
    table.index('status');
    table.index('reconciled_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payment_reconciliation');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
}
