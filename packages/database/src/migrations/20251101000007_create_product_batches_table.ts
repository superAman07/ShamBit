import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create product_batches table
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

    // Indexes
    table.index('product_id');
    table.index('warehouse_id');
    table.index('batch_number');
    table.index('expiry_date');
    table.index('status');
    table.index(['product_id', 'warehouse_id']);
    table.index(['status', 'expiry_date']);
  });

  console.log('✅ Created product_batches table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_batches');
  console.log('✅ Dropped product_batches table');
}