import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop batch_movements table first (has foreign key to product_batches)
  await knex.schema.dropTableIfExists('batch_movements');
  console.log('✅ Dropped batch_movements table');

  // Drop product_batches table
  await knex.schema.dropTableIfExists('product_batches');
  console.log('✅ Dropped product_batches table');

  console.log('✅ Removed batch inventory system');
}

export async function down(knex: Knex): Promise<void> {
  // Recreate product_batches table
  await knex.schema.createTable('product_batches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('SET NULL');
    table.string('batch_number', 100).notNullable();
    table.date('manufacture_date');
    table.date('expiry_date');
    table.date('received_date');
    table.uuid('received_by_user_id');
    table.integer('quantity').notNullable();
    table.integer('available_qty').notNullable();
    table.decimal('purchase_price', 10, 2);
    table.decimal('mrp', 10, 2);
    table.decimal('selling_price', 10, 2);
    table
      .enum('status', ['Active', 'Expired', 'Sold Out'])
      .defaultTo('Active');
    table.text('remarks');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('product_id');
    table.index('warehouse_id');
    table.index('batch_number');
    table.index('expiry_date');
    table.index('status');
    table.index(['product_id', 'warehouse_id']);
    table.index(['status', 'expiry_date']);
  });

  // Recreate batch_movements table
  await knex.schema.createTable('batch_movements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('batch_id')
      .notNullable()
      .references('id')
      .inTable('product_batches')
      .onDelete('CASCADE');
    table
      .enum('movement_type', ['in', 'out', 'transfer', 'adjustment'])
      .notNullable();
    table.integer('quantity').notNullable();
    table.uuid('from_warehouse_id').references('id').inTable('warehouses');
    table.uuid('to_warehouse_id').references('id').inTable('warehouses');
    table.uuid('order_id');
    table.string('reason', 255);
    table.string('performed_by', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('batch_id');
    table.index('movement_type');
    table.index('created_at');
    table.index(['batch_id', 'movement_type']);
  });

  console.log('✅ Recreated batch inventory system tables');
}
