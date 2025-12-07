import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to categories table
  await knex.schema.alterTable('categories', (table) => {
    // Add hierarchical support
    table.uuid('parent_id').references('id').inTable('categories').onDelete('SET NULL');
    
    // Add SEO and marketing fields
    table.string('slug', 255).unique();
    table.string('banner_url', 500);
    table.string('icon_url', 500);
    table.string('meta_title', 255);
    table.string('meta_description', 255);
    table.boolean('is_featured').defaultTo(false);
  });

  // Generate slugs for existing categories
  const categories = await knex('categories').select('id', 'name');
  for (const category of categories) {
    const slug = category.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    await knex('categories')
      .where('id', category.id)
      .update({ slug });
  }

  // Add new indexes
  await knex.schema.alterTable('categories', (table) => {
    table.index('parent_id');
    table.index('slug');
    table.index(['is_active', 'is_featured']);
    table.index(['parent_id', 'display_order']);
  });

  console.log('✅ Enhanced categories table with hierarchical and SEO features');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('categories', (table) => {
    table.dropColumn('parent_id');
    table.dropColumn('slug');
    table.dropColumn('banner_url');
    table.dropColumn('icon_url');
    table.dropColumn('meta_title');
    table.dropColumn('meta_description');
    table.dropColumn('is_featured');
  });

  console.log('✅ Reverted categories table enhancements');
}