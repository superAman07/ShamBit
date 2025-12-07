-- Performance optimization indexes for product queries
-- Run this migration to improve portal performance

-- Index for product search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_text 
ON products USING gin(to_tsvector('english', 
  name || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(brand, '') || ' ' ||
  COALESCE(search_keywords, '') || ' ' ||
  COALESCE(sku, '') || ' ' ||
  COALESCE(barcode, '')
));

-- Index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_sellable_featured 
ON products (is_active, is_sellable, is_featured, created_at DESC);

-- Index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
ON products (category_id, is_active, created_at DESC);

-- Index for brand filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_active 
ON products (brand_id, is_active, created_at DESC);

-- Index for price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_range 
ON products (selling_price, is_active, is_sellable);

-- Index for SKU and barcode lookups
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_unique 
ON products (sku) WHERE sku IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode_unique 
ON products (barcode) WHERE barcode IS NOT NULL;

-- Index for simple text searches (ILIKE queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_ilike 
ON products USING gin(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_ilike 
ON products USING gin(sku gin_trgm_ops) WHERE sku IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode_ilike 
ON products USING gin(barcode gin_trgm_ops) WHERE barcode IS NOT NULL;

-- Enable pg_trgm extension for trigram matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for product attributes filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_attributes_name_value 
ON product_attributes (attribute_name, attribute_value, product_id);

-- Index for product images
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_order 
ON product_images (product_id, display_order);

-- Analyze tables to update statistics
ANALYZE products;
ANALYZE product_attributes;
ANALYZE product_images;
ANALYZE categories;
ANALYZE brands;

-- Create a view for optimized product list queries
CREATE OR REPLACE VIEW products_list_view AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.barcode,
  p.brand,
  p.selling_price,
  p.mrp,
  p.is_featured,
  p.is_active,
  p.is_sellable,
  p.image_urls,
  p.category_id,
  p.brand_id,
  p.created_at,
  c.name as category_name,
  b.name as brand_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id;

-- Add comments for documentation
COMMENT ON INDEX idx_products_search_text IS 'Full-text search index for product search queries';
COMMENT ON INDEX idx_products_active_sellable_featured IS 'Composite index for common product filtering';
COMMENT ON INDEX idx_products_category_active IS 'Index for category-based product filtering';
COMMENT ON INDEX idx_products_brand_active IS 'Index for brand-based product filtering';
COMMENT ON INDEX idx_products_price_range IS 'Index for price range queries';
COMMENT ON VIEW products_list_view IS 'Optimized view for product list queries with minimal joins';