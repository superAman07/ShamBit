import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, create a default brand for existing products
  const [defaultBrand] = await knex('brands')
    .insert({
      name: 'Generic Brand',
      description: 'Default brand for migrated products',
      is_active: true
    })
    .returning('id');

  // Add new columns to products table
  await knex.schema.alterTable('products', (table) => {
    // Brand relationship
    table.uuid('brand_id').references('id').inTable('brands').onDelete('SET NULL');
    
    // Enhanced product fields
    table.string('slug', 255).unique();
    table.string('sku', 100).unique();
    table.string('barcode', 100);
    table.text('detailed_description');
    table.string('unit_type', 50);
    table.decimal('selling_price', 10, 2);
    table.decimal('tax_percent', 5, 2).defaultTo(0);
    table.decimal('discount_percent', 5, 2).defaultTo(0);
    table.decimal('weight', 10, 3);
    table.string('dimensions', 100);
    table.string('storage_info', 255);
    
    // Food-specific fields
    table.text('ingredients');
    table.text('nutrition_info');
    table.integer('shelf_life_days');
    
    // Marketing and search fields
    table.text('search_keywords');
    table.text('tags');
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_returnable').defaultTo(true);
    table.boolean('is_sellable').defaultTo(true);
  });

  // Migrate existing data
  const products = await knex('products').select('id', 'name', 'brand', 'price', 'mrp');
  
  for (const product of products) {
    // Generate slug from name
    const slug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Generate SKU
    const sku = `SKU-${product.id.substring(0, 8).toUpperCase()}`;
    
    // Convert price from paise to rupees
    const sellingPrice = product.price / 100;
    const mrpPrice = product.mrp / 100;
    
    // Find or create brand
    let brandId = defaultBrand.id;
    if (product.brand) {
      const existingBrand = await knex('brands')
        .where('name', product.brand)
        .first();
      
      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const [newBrand] = await knex('brands')
          .insert({
            name: product.brand,
            is_active: true
          })
          .returning('id');
        brandId = newBrand.id;
      }
    }
    
    await knex('products')
      .where('id', product.id)
      .update({
        brand_id: brandId,
        slug: slug,
        sku: sku,
        selling_price: sellingPrice,
        // Keep mrp as integer for now, will be converted later
      });
  }

  // Add new indexes
  await knex.schema.alterTable('products', (table) => {
    table.index('brand_id');
    table.index('slug');
    table.index('sku');
    table.index('barcode');
    table.index(['is_active', 'is_sellable']);
    table.index('is_featured');
  });

  // Add full-text search index
  await knex.raw(`
    CREATE INDEX idx_products_name_search 
    ON products 
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(search_keywords, '')))
  `);

  console.log('✅ Enhanced products table with comprehensive e-commerce fields');
}

export async function down(knex: Knex): Promise<void> {
  // Drop the full-text search index
  await knex.raw('DROP INDEX IF EXISTS idx_products_name_search');

  await knex.schema.alterTable('products', (table) => {
    table.dropColumn('brand_id');
    table.dropColumn('slug');
    table.dropColumn('sku');
    table.dropColumn('barcode');
    table.dropColumn('detailed_description');
    table.dropColumn('unit_type');
    table.dropColumn('selling_price');
    table.dropColumn('tax_percent');
    table.dropColumn('discount_percent');
    table.dropColumn('weight');
    table.dropColumn('dimensions');
    table.dropColumn('storage_info');
    table.dropColumn('ingredients');
    table.dropColumn('nutrition_info');
    table.dropColumn('shelf_life_days');
    table.dropColumn('search_keywords');
    table.dropColumn('tags');
    table.dropColumn('is_featured');
    table.dropColumn('is_returnable');
    table.dropColumn('is_sellable');
  });

  console.log('✅ Reverted products table enhancements');
}