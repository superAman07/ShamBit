import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create product_images table
  await knex.schema.createTable('product_images', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('product_id')
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('image_url', 500).notNullable();
    table.string('alt_text', 255);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('product_id');
    table.index(['product_id', 'display_order']);
  });

  // Create unique constraint for primary image per product
  await knex.raw(`
    CREATE UNIQUE INDEX idx_product_images_primary 
    ON product_images(product_id) 
    WHERE is_primary = TRUE
  `);

  // Migrate existing image_urls array to product_images table
  const products = await knex('products')
    .select('id', 'image_urls')
    .whereNotNull('image_urls');

  for (const product of products) {
    if (product.image_urls && product.image_urls.length > 0) {
      const imageInserts = product.image_urls.map((url: string, index: number) => ({
        product_id: product.id,
        image_url: url,
        display_order: index,
        is_primary: index === 0, // First image is primary
        alt_text: `Product image ${index + 1}`
      }));

      if (imageInserts.length > 0) {
        await knex('product_images').insert(imageInserts);
      }
    }
  }

  console.log('✅ Created product_images table and migrated existing image data');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_images');
  console.log('✅ Dropped product_images table');
}