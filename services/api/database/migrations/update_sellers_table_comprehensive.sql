-- Comprehensive Seller Registration Database Migration
-- This migration updates the sellers table to support the complete seller onboarding workflow

-- Drop existing sellers table if it exists (for development)
-- DROP TABLE IF EXISTS sellers CASCADE;

-- Create comprehensive sellers table
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Part A: Personal Details
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    mobile VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Part B: Business Information
    seller_type VARCHAR(20) NOT NULL CHECK (seller_type IN ('individual', 'business')),
    business_type VARCHAR(30) CHECK (business_type IN ('proprietorship', 'partnership', 'llp', 'private_limited', 'individual_seller')),
    business_name VARCHAR(255),
    nature_of_business TEXT,
    primary_business_activity TEXT,
    year_of_establishment INTEGER CHECK (year_of_establishment >= 1900 AND year_of_establishment <= EXTRACT(YEAR FROM CURRENT_DATE)),
    business_phone VARCHAR(15),
    business_email VARCHAR(255),
    
    -- Part C: Address Information
    registered_business_address JSONB NOT NULL,
    warehouse_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Part D: Tax & Compliance Details
    gst_registered BOOLEAN NOT NULL DEFAULT false,
    gst_number VARCHAR(15),
    gstin VARCHAR(15),
    pan_number VARCHAR(10) NOT NULL,
    pan_holder_name VARCHAR(255) NOT NULL,
    tds_applicable BOOLEAN DEFAULT false,
    aadhaar_number VARCHAR(12),
    
    -- Part E: Bank Account Details
    bank_details JSONB NOT NULL,
    
    -- Part F: Document Upload Status
    documents JSONB DEFAULT '{}'::jsonb,
    
    -- Operational Information
    primary_product_categories TEXT NOT NULL,
    estimated_monthly_order_volume VARCHAR(20) NOT NULL CHECK (estimated_monthly_order_volume IN ('0-50', '51-200', '201-500', '500+')),
    preferred_pickup_time_slots TEXT NOT NULL,
    max_order_processing_time INTEGER NOT NULL CHECK (max_order_processing_time >= 1 AND max_order_processing_time <= 30),
    
    -- Verification Status
    mobile_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    documents_verified BOOLEAN DEFAULT false,
    overall_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (overall_verification_status IN ('pending', 'in_review', 'approved', 'rejected', 'suspended')),
    
    -- Financial Terms & Agreements
    commission_rate_accepted BOOLEAN NOT NULL DEFAULT false,
    payment_settlement_terms_accepted BOOLEAN NOT NULL DEFAULT false,
    
    -- Legal Declarations & Agreements
    terms_and_conditions_accepted BOOLEAN NOT NULL DEFAULT false,
    return_policy_accepted BOOLEAN NOT NULL DEFAULT false,
    data_compliance_accepted BOOLEAN NOT NULL DEFAULT false,
    privacy_policy_accepted BOOLEAN NOT NULL DEFAULT false,
    
    -- System Fields
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    verification_notes TEXT,
    rejection_reason TEXT,
    
    -- Login Credentials (generated after approval)
    username VARCHAR(50) UNIQUE,
    login_credentials_generated BOOLEAN DEFAULT false,
    credentials_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);
CREATE INDEX IF NOT EXISTS idx_sellers_mobile ON sellers(mobile);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_verification_status ON sellers(overall_verification_status);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);
CREATE INDEX IF NOT EXISTS idx_sellers_gst_number ON sellers(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_pan_number ON sellers(pan_number);
CREATE INDEX IF NOT EXISTS idx_sellers_business_type ON sellers(business_type) WHERE business_type IS NOT NULL;

-- Create GIN index for JSONB fields for better search performance
CREATE INDEX IF NOT EXISTS idx_sellers_registered_address_gin ON sellers USING GIN(registered_business_address);
CREATE INDEX IF NOT EXISTS idx_sellers_warehouse_addresses_gin ON sellers USING GIN(warehouse_addresses);
CREATE INDEX IF NOT EXISTS idx_sellers_documents_gin ON sellers USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_sellers_bank_details_gin ON sellers USING GIN(bank_details);

-- Create seller notifications table
CREATE TABLE IF NOT EXISTS seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller_id ON seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_is_read ON seller_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_created_at ON seller_notifications(created_at);

-- Create seller category requests table
CREATE TABLE IF NOT EXISTS seller_category_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for category requests
CREATE INDEX IF NOT EXISTS idx_seller_category_requests_seller_id ON seller_category_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_category_requests_status ON seller_category_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_category_requests_created_at ON seller_category_requests(created_at);

-- Create seller brand requests table
CREATE TABLE IF NOT EXISTS seller_brand_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for brand requests
CREATE INDEX IF NOT EXISTS idx_seller_brand_requests_seller_id ON seller_brand_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_brand_requests_status ON seller_brand_requests(status);
CREATE INDEX IF NOT EXISTS idx_seller_brand_requests_created_at ON seller_brand_requests(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_notifications_updated_at ON seller_notifications;
CREATE TRIGGER update_seller_notifications_updated_at BEFORE UPDATE ON seller_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_category_requests_updated_at ON seller_category_requests;
CREATE TRIGGER update_seller_category_requests_updated_at BEFORE UPDATE ON seller_category_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_brand_requests_updated_at ON seller_brand_requests;
CREATE TRIGGER update_seller_brand_requests_updated_at BEFORE UPDATE ON seller_brand_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints for data integrity
ALTER TABLE sellers ADD CONSTRAINT check_gst_number_when_registered 
    CHECK (NOT gst_registered OR (gst_registered AND (gst_number IS NOT NULL OR gstin IS NOT NULL)));

ALTER TABLE sellers ADD CONSTRAINT check_business_name_when_business 
    CHECK (seller_type != 'business' OR (seller_type = 'business' AND business_name IS NOT NULL));

ALTER TABLE sellers ADD CONSTRAINT check_business_type_when_business 
    CHECK (seller_type != 'business' OR (seller_type = 'business' AND business_type IS NOT NULL));

-- Add check constraints for required agreements
ALTER TABLE sellers ADD CONSTRAINT check_required_agreements 
    CHECK (
        terms_and_conditions_accepted = true AND 
        return_policy_accepted = true AND 
        data_compliance_accepted = true AND 
        privacy_policy_accepted = true AND
        commission_rate_accepted = true AND
        payment_settlement_terms_accepted = true
    );

-- Create view for seller summary (for admin dashboard)
CREATE OR REPLACE VIEW seller_summary AS
SELECT 
    s.id,
    s.full_name,
    s.business_name,
    s.email,
    s.mobile,
    s.seller_type,
    s.business_type,
    s.status,
    s.overall_verification_status,
    s.mobile_verified,
    s.email_verified,
    s.documents_verified,
    s.login_credentials_generated,
    (s.registered_business_address->>'city') as city,
    (s.registered_business_address->>'state') as state,
    s.gst_registered,
    s.created_at,
    s.approved_at,
    -- Count of uploaded documents
    (
        SELECT COUNT(*)
        FROM jsonb_object_keys(s.documents) AS doc_key
        WHERE (s.documents->doc_key->>'uploaded')::boolean = true
    ) as documents_uploaded_count,
    -- Count of verified documents
    (
        SELECT COUNT(*)
        FROM jsonb_object_keys(s.documents) AS doc_key
        WHERE (s.documents->doc_key->>'verified')::boolean = true
    ) as documents_verified_count
FROM sellers s;

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE ON sellers TO seller_api_user;
-- GRANT SELECT, INSERT, UPDATE ON seller_notifications TO seller_api_user;
-- GRANT SELECT, INSERT, UPDATE ON seller_category_requests TO seller_api_user;
-- GRANT SELECT, INSERT, UPDATE ON seller_brand_requests TO seller_api_user;
-- GRANT SELECT ON seller_summary TO seller_api_user;

-- Insert sample data for testing (optional)
-- This can be removed in production
/*
INSERT INTO sellers (
    full_name, date_of_birth, gender, mobile, email, password_hash,
    seller_type, business_type, business_name, nature_of_business,
    registered_business_address, warehouse_addresses,
    gst_registered, pan_number, pan_holder_name, bank_details,
    primary_product_categories, estimated_monthly_order_volume,
    preferred_pickup_time_slots, max_order_processing_time,
    terms_and_conditions_accepted, return_policy_accepted,
    data_compliance_accepted, privacy_policy_accepted,
    commission_rate_accepted, payment_settlement_terms_accepted
) VALUES (
    'Test Seller', '1985-01-01', 'male', '9999999999', 'test@example.com', '$2b$10$hashedpassword',
    'business', 'proprietorship', 'Test Business', 'Test business description',
    '{"addressLine1": "Test Address", "city": "Test City", "state": "Test State", "pinCode": "123456"}',
    '[{"isPrimary": true, "addressLine1": "Warehouse Address", "city": "Test City", "state": "Test State", "pinCode": "123456"}]',
    true, 'ABCDE1234F', 'Test Seller',
    '{"accountHolderName": "Test Seller", "bankName": "Test Bank", "accountNumber": "1234567890", "ifscCode": "TEST0001234", "accountType": "current"}',
    'Test products', '0-50', '9 AM - 6 PM', 2,
    true, true, true, true, true, true
);
*/

COMMIT;