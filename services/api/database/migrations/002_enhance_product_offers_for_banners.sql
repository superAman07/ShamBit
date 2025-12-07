-- Migration: Enhance product_offers table for banner management
-- Date: 2025-11-08
-- Description: Add fields to support banner functionality while maintaining product offer compatibility

-- Add new columns for banner functionality
ALTER TABLE product_offers 
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50) DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS action_value TEXT,
  ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_type VARCHAR(50) DEFAULT 'promotional',
  ADD COLUMN IF NOT EXISTS background_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS text_color VARCHAR(7);

-- Make product_id optional (for general banners that don't link to specific products)
ALTER TABLE product_offers 
  ALTER COLUMN product_id DROP NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_offers_banner_type 
  ON product_offers(banner_type, is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_product_offers_display_order 
  ON product_offers(display_order, is_active);

CREATE INDEX IF NOT EXISTS idx_product_offers_action_type 
  ON product_offers(action_type);

-- Add check constraints for data integrity
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_action_type') THEN
    ALTER TABLE product_offers 
      ADD CONSTRAINT check_action_type 
      CHECK (action_type IN ('product', 'category', 'url', 'search', 'none'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_banner_type') THEN
    ALTER TABLE product_offers 
      ADD CONSTRAINT check_banner_type 
      CHECK (banner_type IN ('hero', 'promotional', 'category', 'product'));
  END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE product_offers IS 'Unified table for product offers and promotional banners';

-- Add comments to new columns
COMMENT ON COLUMN product_offers.action_type IS 'Type of action when banner is clicked: product, category, url, search, none';
COMMENT ON COLUMN product_offers.action_value IS 'Value for the action: product ID, category ID, URL, or search query';
COMMENT ON COLUMN product_offers.mobile_image_url IS 'Optimized image URL for mobile devices';
COMMENT ON COLUMN product_offers.display_order IS 'Order in which banners are displayed (lower numbers first)';
COMMENT ON COLUMN product_offers.banner_type IS 'Type of banner: hero (home carousel), promotional, category, or product';
COMMENT ON COLUMN product_offers.background_color IS 'Hex color code for banner background';
COMMENT ON COLUMN product_offers.text_color IS 'Hex color code for banner text';
