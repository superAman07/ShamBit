-- Performance Optimization Indexes for Enhanced Product Catalog
-- This file contains all the indexes needed for optimal query performance

-- ============================================================================
-- PRODUCT INDEXES
-- ============================================================================

-- Full-text search index for products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_fulltext_search 
ON products USING gin(to_tsvector('english', 
  name || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(detailed_description, '') || ' ' ||
  COALESCE(brand, '') || ' ' ||
  COALESCE(search_keywords, '') || ' ' ||
  COALESCE(tags, '') || ' ' ||
  COALESCE(sku, '') || ' ' ||
  COALESCE(barcode, '')
));

-- Composite index for product filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_filter_sort 
ON products (is_active, is_sellable, is_featured, category_id, brand_id, selling_price);

-- Index for price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_range 
ON products (selling_price) WHERE is_active = true AND is_sellable = true;

-- Index for product search by attributes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_attributes_search 
ON products (id) WHERE is_active = true;

-- Index for barcode and SKU lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode_sku 
ON products (barcode, sku) WHERE is_active = true;

-- Index for brand-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_active 
ON products (brand_id, is_active, is_sellable);

-- Index for category-based filtering with sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_sort 
ON products (category_id, is_active, is_sellable, created_at DESC);

-- Partial index for featured products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_featured 
ON products (created_at DESC) WHERE is_featured = true AND is_active = true;

-- ============================================================================
-- CATEGORY INDEXES
-- ============================================================================

-- Hierarchical category index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_hierarchy 
ON categories (parent_id, display_order, name) WHERE is_active = true;

-- Category slug index for URL routing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug_active 
ON categories (slug) WHERE is_active = true;

-- Featured categories index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_featured 
ON categories (display_order, name) WHERE is_featured = true AND is_active = true;

-- ============================================================================
-- INVENTORY INDEXES
-- ============================================================================

-- Multi-warehouse inventory lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_warehouse 
ON inventory (product_id, warehouse_id, stock_level);

-- Low stock alerts index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock 
ON inventory (warehouse_id, stock_level, available_stock) 
WHERE stock_level IN ('Low', 'Out') AND status = 'Active';

-- Inventory aggregation index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_aggregation 
ON inventory (product_id, available_stock, total_stock) WHERE status = 'Active';

-- Inventory history index for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_history_product_date 
ON inventory_history (product_id, created_at DESC);

-- Inventory history by warehouse
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_history_warehouse_date 
ON inventory_history (warehouse_id, created_at DESC);

-- ============================================================================
-- BATCH TRACKING INDEXES
-- ============================================================================

-- FIFO batch allocation index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_fifo_allocation 
ON product_batches (product_id, warehouse_id, expiry_date, status) 
WHERE status = 'Active' AND available_qty > 0;

-- Expiry date monitoring index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_expiry_monitoring 
ON product_batches (expiry_date, status, available_qty) 
WHERE status = 'Active';

-- Batch number lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_batch_number 
ON product_batches (batch_number, product_id, warehouse_id);

-- Batch movements history index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_movements_history 
ON batch_movements (batch_id, created_at DESC);

-- ============================================================================
-- PRODUCT IMAGES INDEXES
-- ============================================================================

-- Product images ordering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_ordering 
ON product_images (product_id, display_order, is_primary);

-- Primary image lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_primary 
ON product_images (product_id) WHERE is_primary = true;

-- ============================================================================
-- PRODUCT ATTRIBUTES INDEXES
-- ============================================================================

-- Attribute-based product filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_attributes_filtering 
ON product_attributes (attribute_name, attribute_value, product_id);

-- Product attribute lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_attributes_product 
ON product_attributes (product_id, attribute_name);

-- ============================================================================
-- PRODUCT OFFERS INDEXES
-- ============================================================================

-- Active offers lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_offers_active 
ON product_offers (product_id, is_active, start_date, end_date) 
WHERE is_active = true;

-- Offer date range index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_offers_date_range 
ON product_offers (start_date, end_date, is_active);

-- ============================================================================
-- WAREHOUSE INDEXES
-- ============================================================================

-- Geolocation index for nearest warehouse queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouses_geolocation 
ON warehouses (latitude, longitude) WHERE is_active = true;

-- Warehouse code lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouses_code_active 
ON warehouses (code) WHERE is_active = true;

-- ============================================================================
-- BRAND INDEXES
-- ============================================================================

-- Brand name lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brands_name_active 
ON brands (name) WHERE is_active = true;

-- Brand country filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brands_country_active 
ON brands (country, is_active);

-- ============================================================================
-- RESERVATION INDEXES
-- ============================================================================

-- Active reservations cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_cleanup 
ON inventory_reservations (expires_at, status) WHERE status = 'active';

-- User reservations lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_user 
ON inventory_reservations (user_id, status, expires_at);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Product search with category and brand filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_filter 
ON products (category_id, brand_id, is_active, is_sellable, selling_price, created_at DESC);

-- Inventory with product and warehouse details
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_details 
ON inventory (product_id, warehouse_id, stock_level, available_stock, updated_at DESC);

-- Product offers with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_product_dates 
ON product_offers (product_id, is_active, start_date, end_date, discount_value DESC);

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Only active, sellable products for customer queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_customer_view 
ON products (category_id, brand_id, selling_price, created_at DESC) 
WHERE is_active = true AND is_sellable = true;

-- Only products with images for display
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_with_images 
ON products (category_id, is_featured, created_at DESC) 
WHERE is_active = true AND array_length(image_urls, 1) > 0;

-- Only expired batches for cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_expired_cleanup 
ON product_batches (expiry_date, updated_at) 
WHERE status = 'Active' AND available_qty > 0;

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE products;
ANALYZE categories;
ANALYZE inventory;
ANALYZE product_batches;
ANALYZE product_images;
ANALYZE product_attributes;
ANALYZE product_offers;
ANALYZE warehouses;
ANALYZE brands;
ANALYZE inventory_reservations;
ANALYZE inventory_history;
ANALYZE batch_movements;