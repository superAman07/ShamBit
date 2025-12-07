-- Verify Sales Reports Indexes
-- This script checks that all required indexes exist and tests their performance

-- ============================================
-- 1. CHECK EXISTING INDEXES
-- ============================================

\echo '=== Checking Orders Table Indexes ==='
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders'
AND (
    indexname LIKE '%created%' OR
    indexname LIKE '%status%'
)
ORDER BY indexname;

\echo ''
\echo '=== Checking Order Items Table Indexes ==='
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'order_items'
AND (
    indexname LIKE '%product%' OR
    indexname LIKE '%order%'
)
ORDER BY indexname;

-- ============================================
-- 2. VERIFY INDEX PERFORMANCE WITH EXPLAIN ANALYZE
-- ============================================

\echo ''
\echo '=== Test 1: Sales Report Query (Date Range + Status Aggregation) ==='
EXPLAIN ANALYZE
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
  COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
  COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
  COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery_orders,
  COUNT(DISTINCT user_id) as unique_customers,
  AVG(CASE WHEN status = 'delivered' THEN total_amount END) as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' 
  AND created_at <= CURRENT_DATE;

\echo ''
\echo '=== Test 2: Revenue Report Query (Delivered Orders Only) ==='
EXPLAIN ANALYZE
SELECT 
  SUM(total_amount) as total_revenue,
  SUM(subtotal + tax_amount + delivery_fee) as gross_revenue,
  SUM(total_amount) as net_revenue,
  SUM(CASE WHEN payment_method = 'cod' THEN total_amount ELSE 0 END) as cod_revenue,
  SUM(CASE WHEN payment_method = 'online' THEN total_amount ELSE 0 END) as online_revenue,
  SUM(tax_amount) as total_tax,
  SUM(delivery_fee) as total_delivery_fees,
  SUM(discount_amount) as total_discounts
FROM orders
WHERE status = 'delivered' 
  AND created_at >= CURRENT_DATE - INTERVAL '30 days' 
  AND created_at <= CURRENT_DATE;

\echo ''
\echo '=== Test 3: Top Products by Quantity Query ==='
EXPLAIN ANALYZE
SELECT 
  oi.product_id,
  oi.product_name,
  SUM(oi.quantity) as quantity_sold,
  SUM(oi.quantity * oi.unit_price) as revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days' 
  AND o.created_at <= CURRENT_DATE
GROUP BY oi.product_id, oi.product_name
ORDER BY quantity_sold DESC
LIMIT 10;

\echo ''
\echo '=== Test 4: Top Products by Revenue Query ==='
EXPLAIN ANALYZE
SELECT 
  oi.product_id,
  oi.product_name,
  SUM(oi.quantity) as quantity_sold,
  SUM(oi.quantity * oi.unit_price) as revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'delivered'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days' 
  AND o.created_at <= CURRENT_DATE
GROUP BY oi.product_id, oi.product_name
ORDER BY revenue DESC
LIMIT 10;

-- ============================================
-- 3. INDEX USAGE STATISTICS
-- ============================================

\echo ''
\echo '=== Index Usage Statistics ==='
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname IN ('orders', 'order_items')
AND (
    indexrelname LIKE '%created%' OR
    indexrelname LIKE '%status%' OR
    indexrelname LIKE '%product%'
)
ORDER BY relname, indexrelname;

\echo ''
\echo '=== Index Sizes ==='
SELECT 
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE relname IN ('orders', 'order_items')
AND (
    indexrelname LIKE '%created%' OR
    indexrelname LIKE '%status%' OR
    indexrelname LIKE '%product%'
)
ORDER BY relname, indexrelname;
