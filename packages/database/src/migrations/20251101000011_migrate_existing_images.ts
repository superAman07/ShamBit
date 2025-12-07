import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🖼️ Migrating existing image_urls to product_images table...');
  
  // Get all products with image_urls
  const products = await knex('products')
    .select('id', 'image_urls')
    .whereNotNull('image_urls')
    .whereRaw("array_length(image_urls, 1) > 0");

  let migratedCount = 0;
  
  for (const product of products) {
    if (product.image_urls && product.image_urls.length > 0) {
      // Check if images already exist for this product
      const existingImages = await knex('product_images')
        .where('product_id', product.id)
        .count('* as count')
        .first();
      
      if (existingImages && parseInt(existingImages.count as string) === 0) {
        const imageInserts = product.image_urls.map((url: string, index: number) => ({
          product_id: product.id,
          image_url: url,
          display_order: index,
          is_primary: index === 0, // First image is primary
          alt_text: `Product image ${index + 1}`
        }));

        await knex('product_images').insert(imageInserts);
        migratedCount++;
      }
    }
  }

  console.log(`✅ Migrated images for ${migratedCount} products`);
}

export async function down(knex: Knex): Promise<void> {
  // Remove all product images that were migrated
  await knex('product_images').del();
  console.log('✅ Removed migrated product images');
}