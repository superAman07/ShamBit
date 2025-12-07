import { Knex } from 'knex';

/**
 * Migration: Create Cart Management Tables
 * 
 * This migration creates the cart_items and cart_promo_codes tables
 * for the cart management system, along with necessary indexes,
 * constraints, and triggers.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Creating cart management tables...');

  // ============================================
  // CREATE update_timestamp FUNCTION
  // ============================================
  console.log('📋 Creating update_timestamp function...');
  
  // Check if function already exists
  const functionExists = await knex.raw(`
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_timestamp'
  `);

  if (functionExists.rows.length === 0) {
    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created update_timestamp function');
  } else {
    console.log('✅ update_timestamp function already exists');
  }

  // ============================================
  // CREATE cart_items TABLE
  // ============================================
  console.log('📋 Creating cart_items table...');
  
  await knex.schema.createTable('cart_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.integer('quantity').notNullable().checkPositive();
    table.integer('added_price').notNullable().comment('Price at time of adding (in paise)');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint: one entry per product per user
    table.unique(['user_id', 'product_id']);

    // Indexes for performance
    table.index('user_id', 'idx_cart_user');
    table.index('product_id', 'idx_cart_product');
  });

  console.log('✅ Created cart_items table');

  // ============================================
  // CREATE TRIGGER FOR cart_items
  // ============================================
  console.log('📋 Creating trigger for cart_items...');
  
  await knex.raw(`
    CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  `);

  console.log('✅ Created trigger for cart_items');

  // ============================================
  // CREATE cart_promo_codes TABLE
  // ============================================
  console.log('📋 Creating cart_promo_codes table...');
  
  await knex.schema.createTable('cart_promo_codes', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.string('promo_code', 50).notNullable();
    table.uuid('promotion_id').references('id').inTable('promotions').onDelete('SET NULL');
    table.string('discount_type', 20).notNullable().comment('percentage or fixed');
    table.integer('discount_value').notNullable().comment('Percentage (e.g., 10 for 10%) or fixed amount in paise');
    table.integer('discount_amount').notNullable().comment('Calculated discount in paise');
    table.integer('max_discount_amount').comment('Maximum discount cap (for percentage discounts)');
    table.timestamp('applied_at').notNullable().defaultTo(knex.fn.now());

    // Index for performance
    table.index('user_id', 'idx_cart_promo_user');
  });

  console.log('✅ Created cart_promo_codes table');

  console.log('🎉 Cart management tables created successfully!');
  console.log('');
  console.log('Summary:');
  console.log('- Created update_timestamp() function');
  console.log('- Created cart_items table with indexes and constraints');
  console.log('- Created trigger for auto-updating updated_at timestamp');
  console.log('- Created cart_promo_codes table with indexes');
}

export async function down(knex: Knex): Promise<void> {
  console.log('🔄 Rolling back cart management tables...');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('cart_promo_codes');
  console.log('✅ Dropped cart_promo_codes table');

  // Drop trigger before dropping table
  await knex.raw('DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items');
  console.log('✅ Dropped cart_items trigger');

  await knex.schema.dropTableIfExists('cart_items');
  console.log('✅ Dropped cart_items table');

  // Note: We don't drop update_timestamp function as it might be used by other tables
  console.log('ℹ️  Note: update_timestamp() function not dropped (may be used by other tables)');

  console.log('✅ Cart management tables rollback completed');
}
