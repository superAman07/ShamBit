-- Verification Script for Database Schema Simplification
-- Run this after the migration to verify the changes

-- ============================================
-- 1. Verify Unused Tables Are Removed
-- ============================================
SELECT 'Checking for unused tables...' as step;

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('warehouses', 'aggregated_metrics', 'product_batches', 'batch_movements')
ORDER BY tablename;
-- Expected: No rows (all should be removed)

-- ============================================
-- 2. Count Total Indexes
-- ============================================
SELECT 'Counting total indexes...' as step;

SELECT 
    schemaname,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY schemaname;
-- Expected: Significantly fewer indexes than before

-- ============================================
-- 3. Verify Complex Indexes Are Removed
-- ============================================
SELECT 'Checking for removed complex indexes...' as step;

SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_orders_active',
    'idx_inventory_critical_stock',
    'idx_reservations_active',
    'idx_orders_pending_payment',
    'idx_deliveries_performance',
    'idx_delivery_personnel_location',
    'idx_promotion_usage_analytics',
    'idx_inventory_history_type',
    'idx_audit_action_time',
    'idx_inventory_low_stock',
    'idx_inventory_product_stock',
    'idx_orders_payment',
    'idx_orders_delivery_status',
    'idx_orders_promo_code',
    'idx_products_category_price',
    'idx_products_brand_active',
    'idx_reservations_status_expiry',
    'idx_reservations_user_status'
)
ORDER BY indexname;
-- Expected: No rows (all should be removed)

-- ============================================
-- 4. Verify Essential Indexes Are Kept
-- ============================================
SELECT 'Checking for essential operational indexes...' as step;

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'orders', 'inventory', 'deliveries', 'users')
ORDER BY tablename, indexname;
-- Expected: Essential indexes for operational queries

-- ============================================
-- 5. Check Products Table Indexes
-- ============================================
SELECT 'Products table indexes:' as step;

SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'products'
ORDER BY indexname;
-- Expected: Search indexes, active/category indexes

-- ============================================
-- 6. Check Orders Table Indexes
-- ============================================
SELECT 'Orders table indexes:' as step;

SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'orders'
ORDER BY indexname;
-- Expected: Status, created_at, user_id indexes

-- ============================================
-- 7. Check Inventory Table Indexes
-- ============================================
SELECT 'Inventory table indexes:' as step;

SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'inventory'
ORDER BY indexname;
-- Expected: product_id, available_stock indexes only

-- ============================================
-- 8. Check Deliveries Table Indexes
-- ============================================
SELECT 'Deliveries table indexes:' as step;

SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'deliveries'
ORDER BY indexname;
-- Expected: order_id, personnel_id, status indexes

-- ============================================
-- 9. List All Tables
-- ============================================
SELECT 'All tables in database:' as step;

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 10. Database Size Summary
-- ============================================
SELECT 'Database size summary:' as step;

SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    pg_size_pretty(pg_total_relation_size('products')) as products_size,
    pg_size_pretty(pg_total_relation_size('orders')) as orders_size,
    pg_size_pretty(pg_total_relation_size('inventory')) as inventory_size;

-- ============================================
-- 11. Index Size Summary
-- ============================================
SELECT 'Index size summary:' as step;

SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================
-- 12. Verify Migration Status
-- ============================================
SELECT 'Migration status:' as step;

SELECT 
    name,
    run_on
FROM knex_migrations
ORDER BY run_on DESC
LIMIT 10;
-- Expected: 20251114000002_simplify_database_schema.ts should be present
