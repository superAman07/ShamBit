import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add GIN index for full-text search on product name and description
  await knex.raw(`
    CREATE INDEX idx_products_search_name 
    ON products 
    USING gin(to_tsvector('english', name));
  `);

  await knex.raw(`
    CREATE INDEX idx_products_search_description 
    ON products 
    USING gin(to_tsvector('english', COALESCE(description, '')));
  `);

  // Add index for brand search
  await knex.raw(`
    CREATE INDEX idx_products_brand_lower 
    ON products (LOWER(brand));
  `);

  // Add composite index for common filter combinations
  await knex.schema.alterTable('products', (table) => {
    table.index(['is_active', 'category_id'], 'idx_products_active_category');
    table.index(['is_active', 'price'], 'idx_products_active_price');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_products_search_name');
  await knex.raw('DROP INDEX IF EXISTS idx_products_search_description');
  await knex.raw('DROP INDEX IF EXISTS idx_products_brand_lower');
  await knex.schema.alterTable('products', (table) => {
    table.dropIndex(['is_active', 'category_id'], 'idx_products_active_category');
    table.dropIndex(['is_active', 'price'], 'idx_products_active_price');
  });
}
