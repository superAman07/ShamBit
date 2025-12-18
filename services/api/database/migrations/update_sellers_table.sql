-- Migration to update sellers table with comprehensive registration fields
-- Run this script to update your existing sellers table

-- First, backup existing data if needed
-- CREATE TABLE sellers_backup AS SELECT * FROM sellers;

-- Add new columns to sellers table
ALTER TABLE sellers 
-- Personal Details
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS mobile VARCHAR(15),
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),

-- Seller Type & Business Information  
ADD COLUMN IF NOT EXISTS seller_type VARCHAR(50) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS nature_of_business TEXT,
ADD COLUMN IF NOT EXISTS year_of_establishment INTEGER,
ADD COLUMN IF NOT EXISTS business_phone VARCHAR(15),
ADD COLUMN IF NOT EXISTS business_email VARCHAR(255),

-- Product & Operational Information
ADD COLUMN IF NOT EXISTS primary_product_categories TEXT,
ADD COLUMN IF NOT EXISTS estimated_monthly_order_volume VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_pickup_time_slots TEXT,
ADD COLUMN IF NOT EXISTS max_order_processing_time INTEGER DEFAULT 2,

-- Address Information (JSON fields)
ADD COLUMN IF NOT EXISTS home_address JSONB,
ADD COLUMN IF NOT EXISTS business_address JSONB,
ADD COLUMN IF NOT EXISTS warehouse_address JSONB,

-- Tax & Compliance Details
ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS pan_holder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12),

-- Bank Account Details (JSON field)
ADD COLUMN IF NOT EXISTS bank_details JSONB,

-- Financial Terms
ADD COLUMN IF NOT EXISTS commission_rate_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_settlement_terms_accepted BOOLEAN DEFAULT FALSE,

-- Declarations & Agreements
ADD COLUMN IF NOT EXISTS terms_and_conditions_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_policy_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_compliance_accepted BOOLEAN DEFAULT FALSE,

-- Document Management
ADD COLUMN IF NOT EXISTS documents_uploaded JSONB,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Migrate existing data to new structure
UPDATE sellers SET 
  full_name = owner_name,
  mobile = phone,
  seller_type = 'business',
  home_address = json_build_object(
    'addressLine1', COALESCE(address, ''),
    'city', COALESCE(city, ''),
    'state', '',
    'pinCode', ''
  ),
  business_address = json_build_object(
    'sameAsHome', true,
    'addressLine1', COALESCE(address, ''),
    'city', COALESCE(city, ''),
    'state', '',
    'pinCode', ''
  ),
  gst_registered = CASE WHEN gstin IS NOT NULL AND gstin != '' THEN TRUE ELSE FALSE END,
  primary_product_categories = business_type
WHERE full_name IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sellers_mobile ON sellers(mobile);
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_type ON sellers(seller_type);
CREATE INDEX IF NOT EXISTS idx_sellers_gst_registered ON sellers(gst_registered);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);

-- Add constraints
ALTER TABLE sellers ADD CONSTRAINT chk_seller_type CHECK (seller_type IN ('individual', 'business'));
ALTER TABLE sellers ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Update existing records to have required fields
UPDATE sellers SET 
  commission_rate_accepted = TRUE,
  payment_settlement_terms_accepted = TRUE,
  terms_and_conditions_accepted = TRUE,
  return_policy_accepted = TRUE,
  data_compliance_accepted = TRUE
WHERE commission_rate_accepted IS NULL;

-- Add seller authentication fields
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS credentials_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create seller category requests table
CREATE TABLE IF NOT EXISTS seller_category_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create seller brand requests table
CREATE TABLE IF NOT EXISTS seller_brand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  brand_name VARCHAR(255) NOT NULL,
  description TEXT,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create seller notifications table
CREATE TABLE IF NOT EXISTS seller_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add seller_id to products table if not exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'hold')),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_category_requests_seller_id ON seller_category_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_category_requests_status ON seller_category_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_brand_requests_seller_id ON seller_brand_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_brand_requests_status ON seller_brand_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id ON seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_is_read ON seller_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_verification_status ON products(verification_status);

-- Add constraints for product verification
ALTER TABLE products ADD CONSTRAINT chk_verification_status CHECK (verification_status IN ('pending', 'approved', 'rejected', 'hold'));