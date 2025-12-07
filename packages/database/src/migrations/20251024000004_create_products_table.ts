import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('category_id')
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('brand', 100);
    table.string('unit_size', 50);
    table.integer('price').notNullable(); // In smallest currency unit (paise)
    table.integer('mrp').notNullable(); // Maximum retail price
    table.specificType('image_urls', 'TEXT[]').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('category_id');
    table.index('is_active');
    table.index('name'); // For search
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('products');
}
