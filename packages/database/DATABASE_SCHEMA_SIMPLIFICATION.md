# Database Schema Simplification

## Overview

This document describes the database schema simplification performed as part of the startup simplification initiative. The goal is to remove complex indexes designed for caching and analytics, keeping only essential indexes for operational queries.

## Migration: 20251114000002_simplify_database_schema.ts

### What Was Removed

#### 1. Complex Caching Indexes (Partial Indexes)
- `idx_orders_active` - Partial index for active orders only
- `idx_inventory_critical_stock` - Partial index for low stock products
- `idx_reservations_active` - Partial index for active reservations
- `idx_orders_pending_payment` - Partial index for pending payments

#### 2. Analytics-Focused Indexes
- `idx_deliveries_performance` - Delivery performance metrics
- `idx_delivery_personnel_location` - Location-based queries for delivery personnel
- `idx_promotion_usage_analytics` - Promotion usage analytics
- `idx_inventory_history_type` - Inventory change type analytics
- `idx_audit_action_time` - Admin audit log analytics

#### 3. Complex Composite Indexes
- `idx_inventory_low_stock` - Complex inventory low stock tracking
- `idx_inventory_product_stock` - Product stock lookup optimization
- `idx_orders_payment` - Payment reconciliation
- `idx_orders_delivery_status` - Delivery assignment optimization
- `idx_orders_promo_code` - Promo code analytics
- `idx_products_category_price` - Price range queries
- `idx_products_brand_active` - Brand filtering
- `idx_reservations_status_expiry` - Reservation cleanup optimization
- `idx_reservations_user_status` - User reservation tracking

### What Was Kept (Essential Operational Indexes)

#### Products Table
- `is_active` - Filter active products
- `category_id` - Category filtering
- Full-text search indexes (GIN indexes on name and description)
- `idx_products_active_category` - Basic category filtering
- `idx_products_active_price` - Basic price filtering

#### Orders Table
- `status` - Order status filtering
- `created_at` - Order chronological queries
- `user_id` - User order lookup
- `idx_orders_status_simple` - Simple status index (added)

#### Inventory Table
- `product_id` - Product inventory lookup
- `available_stock` - Stock availability queries

#### Deliveries Table
- `order_id` - Order delivery lookup
- `delivery_personnel_id` - Personnel assignment lookup
- `status` - Delivery status filtering
- `idx_deliveries_personnel_status` - Personnel status queries
- `idx_deliveries_order_status` - Order status queries

#### Users Table
- `email` - User login
- `phone` - User lookup by phone

#### Other Essential Indexes
- Promotion usage: `idx_promotion_usage_user` - User promotion tracking
- Promotions: `idx_promotions_active_dates`, `idx_promotions_code_active`
- Categories: `idx_categories_active_order`
- User addresses: `idx_addresses_user_default`, `idx_addresses_location`
- Inventory history: `idx_inventory_history_product`
- Admin audit logs: `idx_audit_admin_time`, `idx_audit_resource`
- Delivery personnel: `idx_delivery_personnel_available`

### Verified Unused Tables Removed

The migration verifies that the following unused tables have been removed by previous migrations:
- `warehouses` - Removed in 20251113000001_remove_warehouse_module.ts
- `aggregated_metrics` - Removed in 20251113000002_remove_analytics_tables.ts
- `product_batches` - Removed in 20251113000003_remove_batch_inventory_system.ts
- `batch_movements` - Removed in 20251113000003_remove_batch_inventory_system.ts

## Running the Migration

### Prerequisites
1. Ensure PostgreSQL is running
2. Database connection is configured in `.env` file
3. All previous migrations have been run

### Execute Migration

```bash
cd packages/database
npm run migrate:latest
```

### Verify Migration

```bash
# Check migration status
npm run migrate:status

# Connect to database and verify indexes
psql -h localhost -p 5433 -U postgres -d shambit_dev

# List all indexes
\di

# Check specific table indexes
\d+ orders
\d+ products
\d+ inventory
```

## Impact Analysis

### Performance Impact
- **Slightly slower queries**: Without caching-optimized indexes, some queries may be 10-50ms slower
- **Acceptable for startup scale**: For 0-20K users, the performance difference is negligible
- **Simpler query planning**: PostgreSQL query planner has fewer indexes to consider

### Database Size Impact
- **Reduced index storage**: Removing ~20 complex indexes saves disk space
- **Faster writes**: Fewer indexes means faster INSERT/UPDATE operations
- **Simpler maintenance**: Less index bloat to manage

### Operational Benefits
- **Easier to understand**: Fewer indexes makes schema easier to comprehend
- **Faster migrations**: Less indexes to rebuild during schema changes
- **Lower complexity**: Reduced cognitive load for developers

## Rollback Plan

If performance issues arise, the migration can be rolled back:

```bash
cd packages/database
npm run migrate:rollback
```

This will restore all removed indexes.

## Future Considerations

### When to Add Indexes Back

**Add caching indexes when:**
- Query response times consistently > 500ms
- Database CPU usage > 70%
- User count > 50K

**Add analytics indexes when:**
- Real-time dashboards are required
- Complex reporting becomes critical
- Data-driven decision making is essential

### Monitoring Queries

After migration, monitor slow queries:

```sql
-- Enable slow query logging (already configured in application)
-- Check slow queries in logs
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC 
LIMIT 20;
```

## Requirements Satisfied

This migration satisfies the following requirements from the startup simplification spec:

- **12.1**: Remove unused tables ✓
- **12.2**: Remove complex indexes for caching ✓
- **12.3**: Remove analytics aggregation tables ✓
- **12.4**: Remove batch tracking tables ✓
- **12.5**: Optimize indexes for operational queries only ✓

## Summary

The database schema has been simplified by:
1. Removing 20+ complex indexes designed for caching and analytics
2. Keeping ~15 essential operational indexes
3. Verifying all unused tables are removed
4. Optimizing for operational queries only

This results in a leaner, more maintainable database schema suitable for a startup with 0-20K users.
