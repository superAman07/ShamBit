import { Knex } from 'knex';

/**
 * Migration: Add Sales Reports Performance Indexes
 * 
 * This migration adds indexes specifically optimized for sales reports queries.
 * It ensures all necessary indexes exist for efficient report generation.
 */
export async function up(knex: Knex): Promise<void> {
  // Check if indexes already exist before creating them
  
  // ============================================
  // ORDERS TABLE INDEXES FOR SALES REPORTS
  // ============================================
  
  // Index on created_at (if not exists) - for date range filtering
  const hasCreatedAtIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' 
    AND indexname = 'idx_orders_created_desc'
  `);
  
  if (hasCreatedAtIndex.rows.length === 0) {
    await knex.schema.alterTable('orders', (table) => {
      table.index(['created_at'], 'idx_orders_created_desc');
    });
  }
  
  // Index on status (if not exists) - for filtering by order status
  const hasStatusIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' 
    AND indexname = 'orders_status_index'
  `);
  
  if (hasStatusIndex.rows.length === 0) {
    await knex.schema.alterTable('orders', (table) => {
      table.index(['status'], 'orders_status_index');
    });
  }
  
  // Composite index on (created_at, status) (if not exists) - for combined filtering
  const hasCompositeIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'orders' 
    AND indexname = 'idx_orders_status_created'
  `);
  
  if (hasCompositeIndex.rows.length === 0) {
    await knex.schema.alterTable('orders', (table) => {
      table.index(['created_at', 'status'], 'idx_orders_status_created');
    });
  }
  
  // ============================================
  // ORDER_ITEMS TABLE INDEXES FOR PRODUCT REPORTS
  // ============================================
  
  // Index on product_id (if not exists) - for product aggregation queries
  const hasProductIdIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'order_items' 
    AND indexname = 'idx_order_items_product_id'
  `);
  
  if (hasProductIdIndex.rows.length === 0) {
    await knex.schema.alterTable('order_items', (table) => {
      table.index(['product_id'], 'idx_order_items_product_id');
    });
  }
  
  // Additional composite index for order_items (order_id, product_id) for JOIN optimization
  const hasOrderProductIndex = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'order_items' 
    AND indexname = 'idx_order_items_order_product'
  `);
  
  if (hasOrderProductIndex.rows.length === 0) {
    await knex.schema.alterTable('order_items', (table) => {
      table.index(['order_id', 'product_id'], 'idx_order_items_order_product');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes created by this migration
  // Note: We only drop indexes that didn't exist before this migration
  
  await knex.raw(`
    DROP INDEX IF EXISTS idx_order_items_order_product;
  `);
  
  // We don't drop the other indexes as they may have been created by previous migrations
  // and other parts of the system may depend on them
}
