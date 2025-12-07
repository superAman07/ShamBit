import { Knex } from 'knex';

/**
 * Migration: Simplify Database Schema
 * 
 * This migration removes complex indexes designed for caching and analytics,
 * keeping only essential indexes for operational queries.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Starting database schema simplification...');

  // ============================================
  // REMOVE COMPLEX CACHING INDEXES
  // ============================================
  console.log('📋 Phase 1: Removing complex caching indexes...');

  // Drop partial indexes designed for caching
  await knex.raw('DROP INDEX IF EXISTS idx_orders_active');
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_critical_stock');
  await knex.raw('DROP INDEX IF EXISTS idx_reservations_active');
  await knex.raw('DROP INDEX IF EXISTS idx_orders_pending_payment');
  console.log('✅ Dropped partial indexes for caching');

  // ============================================
  // REMOVE ANALYTICS-FOCUSED INDEXES
  // ============================================
  console.log('📋 Phase 2: Removing analytics-focused indexes...');

  // Drop delivery performance indexes (already simplified in previous migration)
  await knex.raw('DROP INDEX IF EXISTS idx_deliveries_performance');
  await knex.raw('DROP INDEX IF EXISTS idx_delivery_personnel_location');
  
  // Drop promotion analytics indexes
  await knex.raw('DROP INDEX IF EXISTS idx_promotion_usage_analytics');

  // Drop inventory history analytics indexes
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_history_type');

  // Drop admin audit log analytics indexes
  await knex.raw('DROP INDEX IF EXISTS idx_audit_action_time');

  console.log('✅ Dropped analytics-focused indexes');

  // ============================================
  // REMOVE COMPLEX COMPOSITE INDEXES
  // ============================================
  console.log('📋 Phase 3: Removing complex composite indexes...');

  // Drop complex inventory indexes (if they exist)
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_low_stock');
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_product_stock');

  // Drop complex order indexes (keep basic ones)
  await knex.raw('DROP INDEX IF EXISTS idx_orders_payment');
  await knex.raw('DROP INDEX IF EXISTS idx_orders_delivery_status');
  await knex.raw('DROP INDEX IF EXISTS idx_orders_promo_code');

  // Drop complex product indexes (keep search indexes)
  await knex.raw('DROP INDEX IF EXISTS idx_products_category_price');
  await knex.raw('DROP INDEX IF EXISTS idx_products_brand_active');

  // Drop complex reservation indexes
  await knex.raw('DROP INDEX IF EXISTS idx_reservations_status_expiry');
  await knex.raw('DROP INDEX IF EXISTS idx_reservations_user_status');

  console.log('✅ Dropped complex composite indexes');

  // ============================================
  // OPTIMIZE REMAINING INDEXES FOR OPERATIONS
  // ============================================
  console.log('📋 Phase 4: Optimizing indexes for operational queries...');

  // Keep essential indexes that are already in place:
  // - products: is_active, category_id, search indexes
  // - orders: status, created_at, user_id
  // - inventory: product_id, available_stock
  // - deliveries: order_id, delivery_personnel_id, status
  // - users: email, phone
  
  // Add simple operational indexes if not already present
  const hasOrderStatusIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' 
    AND indexname = 'idx_orders_status_simple'
  `);

  if (hasOrderStatusIndex.rows.length === 0) {
    await knex.schema.alterTable('orders', (table) => {
      table.index(['status'], 'idx_orders_status_simple');
    });
  }

  console.log('✅ Optimized indexes for operational queries');

  // ============================================
  // VERIFY NO UNUSED TABLES REMAIN
  // ============================================
  console.log('📋 Phase 5: Verifying unused tables are removed...');

  // These should already be dropped by previous migrations, but verify
  const unusedTables = [
    'warehouses',
    'aggregated_metrics',
    'product_batches',
    'batch_movements'
  ];

  for (const tableName of unusedTables) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      console.log(`⚠️  Found unused table: ${tableName}, dropping...`);
      await knex.schema.dropTableIfExists(tableName);
      console.log(`✅ Dropped ${tableName}`);
    }
  }

  console.log('✅ Verified all unused tables are removed');

  console.log('🎉 Database schema simplification completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log('- Removed complex caching indexes');
  console.log('- Removed analytics-focused indexes');
  console.log('- Removed complex composite indexes');
  console.log('- Kept essential operational indexes');
  console.log('- Verified unused tables are removed');
}

export async function down(knex: Knex): Promise<void> {
  console.log('🔄 Starting database schema restoration...');

  // Restore partial indexes
  await knex.raw(`
    CREATE INDEX idx_orders_active 
    ON orders (status, created_at DESC) 
    WHERE status NOT IN ('delivered', 'canceled', 'failed')
  `);

  await knex.raw(`
    CREATE INDEX idx_inventory_critical_stock 
    ON inventory (product_id, available_stock) 
    WHERE available_stock <= low_stock_threshold
  `);

  await knex.raw(`
    CREATE INDEX idx_reservations_active 
    ON inventory_reservations (product_id, expires_at) 
    WHERE status = 'active'
  `);

  await knex.raw(`
    CREATE INDEX idx_orders_pending_payment 
    ON orders (payment_id, created_at) 
    WHERE payment_status = 'pending'
  `);

  // Restore analytics indexes
  await knex.schema.alterTable('promotion_usage', (table) => {
    table.index(['promotion_id', 'used_at'], 'idx_promotion_usage_analytics');
  });

  if (await knex.schema.hasTable('inventory_history')) {
    await knex.schema.alterTable('inventory_history', (table) => {
      table.index(['change_type', 'created_at'], 'idx_inventory_history_type');
    });
  }

  await knex.schema.alterTable('admin_audit_logs', (table) => {
    table.index(['action', 'created_at'], 'idx_audit_action_time');
  });

  // Restore complex composite indexes
  await knex.schema.alterTable('inventory', (table) => {
    table.index(['available_stock', 'low_stock_threshold'], 'idx_inventory_low_stock');
    table.index(['product_id', 'available_stock'], 'idx_inventory_product_stock');
  });

  await knex.schema.alterTable('orders', (table) => {
    table.index(['payment_status', 'payment_id'], 'idx_orders_payment');
    table.index(['delivery_personnel_id', 'status'], 'idx_orders_delivery_status');
    table.index(['promo_code'], 'idx_orders_promo_code');
  });

  await knex.schema.alterTable('products', (table) => {
    table.index(['category_id', 'price', 'is_active'], 'idx_products_category_price');
    table.index(['brand', 'is_active'], 'idx_products_brand_active');
  });

  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.index(['status', 'expires_at'], 'idx_reservations_status_expiry');
    table.index(['user_id', 'status'], 'idx_reservations_user_status');
  });

  // Restore delivery performance indexes
  await knex.schema.alterTable('deliveries', (table) => {
    table.index(['assigned_at', 'delivered_at'], 'idx_deliveries_performance');
  });

  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.index(['current_latitude', 'current_longitude'], 'idx_delivery_personnel_location');
  });

  console.log('✅ Database schema restoration completed');
}
