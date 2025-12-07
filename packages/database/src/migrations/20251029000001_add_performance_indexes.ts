import { Knex } from 'knex';

/**
 * Migration: Add Performance Optimization Indexes
 * 
 * This migration adds comprehensive indexes to optimize query performance
 * across all tables based on common query patterns.
 */
export async function up(knex: Knex): Promise<void> {
  // ============================================
  // INVENTORY TABLE INDEXES
  // ============================================
  await knex.schema.alterTable('inventory', (table) => {
    // Index for low stock queries
    table.index(['available_stock', 'low_stock_threshold'], 'idx_inventory_low_stock');
    // Index for product lookup with stock info
    table.index(['product_id', 'available_stock'], 'idx_inventory_product_stock');
  });

  // ============================================
  // INVENTORY RESERVATIONS INDEXES
  // ============================================
  await knex.schema.alterTable('inventory_reservations', (table) => {
    // Index for cleanup job (expired reservations)
    table.index(['status', 'expires_at'], 'idx_reservations_status_expiry');
    // Index for user reservations
    table.index(['user_id', 'status'], 'idx_reservations_user_status');
  });

  // ============================================
  // ORDERS TABLE ADDITIONAL INDEXES
  // ============================================
  await knex.schema.alterTable('orders', (table) => {
    // Composite index for admin order filtering
    table.index(['status', 'created_at'], 'idx_orders_status_created');
    // Index for payment reconciliation
    table.index(['payment_status', 'payment_id'], 'idx_orders_payment');
    // Index for delivery assignment
    table.index(['delivery_personnel_id', 'status'], 'idx_orders_delivery_status');
    // Index for promo code analytics
    table.index(['promo_code'], 'idx_orders_promo_code');
  });

  // ============================================
  // PRODUCTS TABLE ADDITIONAL INDEXES
  // ============================================
  await knex.schema.alterTable('products', (table) => {
    // Index for price range queries
    table.index(['category_id', 'price', 'is_active'], 'idx_products_category_price');
    // Index for brand filtering
    table.index(['brand', 'is_active'], 'idx_products_brand_active');
  });

  // ============================================
  // PROMOTIONS TABLE INDEXES
  // ============================================
  await knex.schema.alterTable('promotions', (table) => {
    // Index for active promotions lookup
    table.index(['is_active', 'start_date', 'end_date'], 'idx_promotions_active_dates');
    // Index for code validation
    table.index(['code', 'is_active'], 'idx_promotions_code_active');
  });

  // ============================================
  // PROMOTION USAGE INDEXES
  // ============================================
  await knex.schema.alterTable('promotion_usage', (table) => {
    // Index for user usage tracking
    table.index(['promotion_id', 'user_id'], 'idx_promotion_usage_user');
    // Index for analytics
    table.index(['promotion_id', 'used_at'], 'idx_promotion_usage_analytics');
  });

  // ============================================
  // DELIVERY PERSONNEL INDEXES
  // ============================================
  await knex.schema.alterTable('delivery_personnel', (table) => {
    // Index for available personnel lookup
    table.index(['is_active', 'is_available'], 'idx_delivery_personnel_available');
    // Index for location-based queries
    table.index(['current_latitude', 'current_longitude'], 'idx_delivery_personnel_location');
  });

  // ============================================
  // DELIVERIES TABLE INDEXES
  // ============================================
  await knex.schema.alterTable('deliveries', (table) => {
    // Index for active deliveries
    table.index(['delivery_personnel_id', 'status'], 'idx_deliveries_personnel_status');
    // Index for delivery tracking
    table.index(['order_id', 'status'], 'idx_deliveries_order_status');
    // Index for performance metrics
    table.index(['assigned_at', 'delivered_at'], 'idx_deliveries_performance');
  });

  // ============================================
  // ADMIN AUDIT LOGS INDEXES
  // ============================================
  await knex.schema.alterTable('admin_audit_logs', (table) => {
    // Index for admin activity tracking
    table.index(['admin_id', 'created_at'], 'idx_audit_admin_time');
    // Index for resource audit trail
    table.index(['resource_type', 'resource_id'], 'idx_audit_resource');
    // Index for action filtering
    table.index(['action', 'created_at'], 'idx_audit_action_time');
  });

  // ============================================
  // CATEGORIES TABLE INDEXES
  // ============================================
  await knex.schema.alterTable('categories', (table) => {
    // Index for active categories with display order
    table.index(['is_active', 'display_order'], 'idx_categories_active_order');
  });

  // ============================================
  // USER ADDRESSES INDEXES
  // ============================================
  await knex.schema.alterTable('user_addresses', (table) => {
    // Index for default address lookup
    table.index(['user_id', 'is_default'], 'idx_addresses_user_default');
    // Index for location-based queries
    table.index(['city', 'pincode'], 'idx_addresses_location');
  });

  // ============================================
  // INVENTORY HISTORY INDEXES
  // ============================================
  if (await knex.schema.hasTable('inventory_history')) {
    await knex.schema.alterTable('inventory_history', (table) => {
      // Index for product history
      table.index(['product_id', 'created_at'], 'idx_inventory_history_product');
      // Index for change type analytics
      table.index(['change_type', 'created_at'], 'idx_inventory_history_type');
    });
  }

  // ============================================
  // PARTIAL INDEXES (PostgreSQL specific)
  // ============================================
  
  // Partial index for active orders only
  await knex.raw(`
    CREATE INDEX idx_orders_active 
    ON orders (status, created_at DESC) 
    WHERE status NOT IN ('delivered', 'canceled', 'failed')
  `);

  // Partial index for low stock products
  await knex.raw(`
    CREATE INDEX idx_inventory_critical_stock 
    ON inventory (product_id, available_stock) 
    WHERE available_stock <= low_stock_threshold
  `);

  // Partial index for active reservations
  await knex.raw(`
    CREATE INDEX idx_reservations_active 
    ON inventory_reservations (product_id, expires_at) 
    WHERE status = 'active'
  `);

  // Partial index for pending payments
  await knex.raw(`
    CREATE INDEX idx_orders_pending_payment 
    ON orders (payment_id, created_at) 
    WHERE payment_status = 'pending'
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop partial indexes
  await knex.raw('DROP INDEX IF EXISTS idx_orders_active');
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_critical_stock');
  await knex.raw('DROP INDEX IF EXISTS idx_reservations_active');
  await knex.raw('DROP INDEX IF EXISTS idx_orders_pending_payment');

  // Drop inventory history indexes
  if (await knex.schema.hasTable('inventory_history')) {
    await knex.schema.alterTable('inventory_history', (table) => {
      table.dropIndex(['product_id', 'created_at'], 'idx_inventory_history_product');
      table.dropIndex(['change_type', 'created_at'], 'idx_inventory_history_type');
    });
  }

  // Drop user addresses indexes
  await knex.schema.alterTable('user_addresses', (table) => {
    table.dropIndex(['user_id', 'is_default'], 'idx_addresses_user_default');
    table.dropIndex(['city', 'pincode'], 'idx_addresses_location');
  });

  // Drop categories indexes
  await knex.schema.alterTable('categories', (table) => {
    table.dropIndex(['is_active', 'display_order'], 'idx_categories_active_order');
  });

  // Drop admin audit logs indexes
  await knex.schema.alterTable('admin_audit_logs', (table) => {
    table.dropIndex(['admin_id', 'created_at'], 'idx_audit_admin_time');
    table.dropIndex(['resource_type', 'resource_id'], 'idx_audit_resource');
    table.dropIndex(['action', 'created_at'], 'idx_audit_action_time');
  });

  // Drop deliveries indexes
  await knex.schema.alterTable('deliveries', (table) => {
    table.dropIndex(['delivery_personnel_id', 'status'], 'idx_deliveries_personnel_status');
    table.dropIndex(['order_id', 'status'], 'idx_deliveries_order_status');
    table.dropIndex(['assigned_at', 'delivered_at'], 'idx_deliveries_performance');
  });

  // Drop delivery personnel indexes
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.dropIndex(['is_active', 'is_available'], 'idx_delivery_personnel_available');
    table.dropIndex(['current_latitude', 'current_longitude'], 'idx_delivery_personnel_location');
  });

  // Drop promotion usage indexes
  await knex.schema.alterTable('promotion_usage', (table) => {
    table.dropIndex(['promotion_id', 'user_id'], 'idx_promotion_usage_user');
    table.dropIndex(['promotion_id', 'used_at'], 'idx_promotion_usage_analytics');
  });

  // Drop promotions indexes
  await knex.schema.alterTable('promotions', (table) => {
    table.dropIndex(['is_active', 'start_date', 'end_date'], 'idx_promotions_active_dates');
    table.dropIndex(['code', 'is_active'], 'idx_promotions_code_active');
  });

  // Drop products indexes
  await knex.schema.alterTable('products', (table) => {
    table.dropIndex(['category_id', 'price', 'is_active'], 'idx_products_category_price');
    table.dropIndex(['brand', 'is_active'], 'idx_products_brand_active');
  });

  // Drop orders indexes
  await knex.schema.alterTable('orders', (table) => {
    table.dropIndex(['status', 'created_at'], 'idx_orders_status_created');
    table.dropIndex(['payment_status', 'payment_id'], 'idx_orders_payment');
    table.dropIndex(['delivery_personnel_id', 'status'], 'idx_orders_delivery_status');
    table.dropIndex(['promo_code'], 'idx_orders_promo_code');
  });

  // Drop inventory reservations indexes
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.dropIndex(['status', 'expires_at'], 'idx_reservations_status_expiry');
    table.dropIndex(['user_id', 'status'], 'idx_reservations_user_status');
  });

  // Drop inventory indexes
  await knex.schema.alterTable('inventory', (table) => {
    table.dropIndex(['available_stock', 'low_stock_threshold'], 'idx_inventory_low_stock');
    table.dropIndex(['product_id', 'available_stock'], 'idx_inventory_product_stock');
  });
}
