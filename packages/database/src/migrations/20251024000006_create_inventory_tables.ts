import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create inventory table
  await knex.schema.createTable('inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .unique()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.integer('total_stock').notNullable().defaultTo(0);
    table.integer('available_stock').notNullable().defaultTo(0);
    table.integer('reserved_stock').notNullable().defaultTo(0);
    table.integer('low_stock_threshold').defaultTo(10);
    table.timestamp('last_restocked_at');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index('available_stock');
  });

  // Create inventory_history table
  await knex.schema.createTable('inventory_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table
      .enum('change_type', ['restock', 'sale', 'return', 'adjustment'])
      .notNullable();
    table.integer('quantity_change').notNullable();
    table.integer('previous_stock').notNullable();
    table.integer('new_stock').notNullable();
    table.uuid('performed_by'); // Admin ID or system
    table.text('reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index('created_at');
    table.index('change_type');
  });

  // Create inventory_reservations table
  await knex.schema.createTable('inventory_reservations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.integer('quantity').notNullable();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table
      .enum('status', ['active', 'committed', 'released'])
      .defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index('user_id');
    table.index('status');
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_reservations');
  await knex.schema.dropTableIfExists('inventory_history');
  await knex.schema.dropTableIfExists('inventory');
}
