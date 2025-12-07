import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create product_offers table
  await knex.schema.createTable('product_offers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('offer_title', 255).notNullable();
    table.text('offer_description');
    table
      .enum('discount_type', ['Flat', 'Percentage'])
      .notNullable();
    table.decimal('discount_value', 10, 2).notNullable();
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();
    table.string('banner_url', 500);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index('is_active');
    table.index(['start_date', 'end_date']);
    table.index(['is_active', 'start_date', 'end_date']);
  });

  console.log('✅ Created product_offers table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_offers');
  console.log('✅ Dropped product_offers table');
}