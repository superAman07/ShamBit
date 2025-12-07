/**
 * Verification script for cart management tables
 * Checks that cart_items and cart_promo_codes tables were created correctly
 */

const knex = require('knex');
require('dotenv').config({ path: '../../.env' });

async function verifyCartTables() {
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  });

  try {
    console.log('🔍 Verifying cart management tables...\n');

    // Check cart_items table
    console.log('📋 Checking cart_items table...');
    const cartItemsExists = await db.schema.hasTable('cart_items');
    if (!cartItemsExists) {
      throw new Error('cart_items table does not exist!');
    }
    console.log('✅ cart_items table exists');

    // Get cart_items columns
    const cartItemsColumns = await db('cart_items').columnInfo();
    console.log('   Columns:', Object.keys(cartItemsColumns).join(', '));

    // Check cart_promo_codes table
    console.log('\n📋 Checking cart_promo_codes table...');
    const cartPromoExists = await db.schema.hasTable('cart_promo_codes');
    if (!cartPromoExists) {
      throw new Error('cart_promo_codes table does not exist!');
    }
    console.log('✅ cart_promo_codes table exists');

    // Get cart_promo_codes columns
    const cartPromoColumns = await db('cart_promo_codes').columnInfo();
    console.log('   Columns:', Object.keys(cartPromoColumns).join(', '));

    // Check indexes
    console.log('\n📋 Checking indexes...');
    const indexes = await db.raw(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE tablename IN ('cart_items', 'cart_promo_codes')
      ORDER BY tablename, indexname
    `);
    
    console.log('✅ Indexes found:');
    indexes.rows.forEach(row => {
      console.log(`   ${row.tablename}: ${row.indexname}`);
    });

    // Check trigger
    console.log('\n📋 Checking triggers...');
    const triggers = await db.raw(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'cart_items'
    `);

    if (triggers.rows.length === 0) {
      throw new Error('No trigger found on cart_items table!');
    }
    
    console.log('✅ Triggers found:');
    triggers.rows.forEach(row => {
      console.log(`   ${row.trigger_name} (${row.event_manipulation} on ${row.event_object_table})`);
    });

    // Check update_timestamp function
    console.log('\n📋 Checking update_timestamp function...');
    const functionExists = await db.raw(`
      SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp'
    `);

    if (functionExists.rows.length === 0) {
      throw new Error('update_timestamp function does not exist!');
    }
    console.log('✅ update_timestamp function exists');

    // Check constraints
    console.log('\n📋 Checking constraints...');
    const constraints = await db.raw(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid IN (
        SELECT oid FROM pg_class WHERE relname IN ('cart_items', 'cart_promo_codes')
      )
      ORDER BY conname
    `);

    console.log('✅ Constraints found:');
    constraints.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'u': 'UNIQUE',
        'c': 'CHECK'
      }[row.contype] || row.contype;
      console.log(`   ${row.conname}: ${type}`);
    });

    console.log('\n🎉 All cart management tables verified successfully!');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

verifyCartTables();
