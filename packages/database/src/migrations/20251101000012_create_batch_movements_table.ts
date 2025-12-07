import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create batch_movements table for tracking batch inventory changes
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
    table.uuid('order_id'); // Reference to orders if applicable
    table.string('reason', 255);
    table.string('performed_by', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('batch_id');
    table.index('movement_type');
    table.index('created_at');
    table.index(['batch_id', 'movement_type']);
  });

  console.log('✅ Created batch_movements table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('batch_movements');
  console.log('✅ Dropped batch_movements table');
}