import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create product_attributes table
  await knex.schema.createTable('product_attributes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('attribute_name', 255).notNullable();
    table.string('attribute_value', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index('attribute_name');
    table.index('attribute_value');
    table.index(['attribute_name', 'attribute_value']);
    table.index(['product_id', 'attribute_name']);
  });

  console.log('✅ Created product_attributes table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_attributes');
  console.log('✅ Dropped product_attributes table');
}