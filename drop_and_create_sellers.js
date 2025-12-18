const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the database connection from the packages
const { initializeDatabase } = require('./packages/database/dist/postgres');

async function dropAndCreateSellers() {
  console.log('🚀 Dropping and recreating sellers table...');
  
  // Initialize database with the same config as the API
  const db = initializeDatabase({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shambit_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10'),
  });

  try {
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');

    // Drop existing tables and dependencies
    console.log('🗑️ Dropping existing tables...');
    
    await db.raw('DROP TABLE IF EXISTS seller_notifications CASCADE;');
    await db.raw('DROP TABLE IF EXISTS seller_category_requests CASCADE;');
    await db.raw('DROP TABLE IF EXISTS seller_brand_requests CASCADE;');
    await db.raw('DROP VIEW IF EXISTS seller_summary CASCADE;');
    await db.raw('DROP TABLE IF EXISTS sellers CASCADE;');
    
    console.log('✅ Existing tables dropped');

    // Create the comprehensive sellers table
    console.log('🔄 Creating comprehensive sellers table...');
    
    const createTableSQL = `
-- Create comprehensive sellers table
CREATE TABLE sellers (
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
    approved_by UUID
);`;

    await db.raw(createTableSQL);
    console.log('✅ Sellers table created');

    // Create indexes
    console.log('🔄 Creating indexes...');
    await db.raw('CREATE INDEX idx_sellers_email ON sellers(email);');
    await db.raw('CREATE INDEX idx_sellers_mobile ON sellers(mobile);');
    await db.raw('CREATE INDEX idx_sellers_status ON sellers(status);');
    await db.raw('CREATE INDEX idx_sellers_verification_status ON sellers(overall_verification_status);');
    await db.raw('CREATE INDEX idx_sellers_created_at ON sellers(created_at);');
    await db.raw('CREATE INDEX idx_sellers_gst_number ON sellers(gst_number) WHERE gst_number IS NOT NULL;');
    await db.raw('CREATE INDEX idx_sellers_pan_number ON sellers(pan_number);');
    await db.raw('CREATE INDEX idx_sellers_business_type ON sellers(business_type) WHERE business_type IS NOT NULL;');
    
    // Create GIN indexes for JSONB fields
    await db.raw('CREATE INDEX idx_sellers_registered_address_gin ON sellers USING GIN(registered_business_address);');
    await db.raw('CREATE INDEX idx_sellers_warehouse_addresses_gin ON sellers USING GIN(warehouse_addresses);');
    await db.raw('CREATE INDEX idx_sellers_documents_gin ON sellers USING GIN(documents);');
    await db.raw('CREATE INDEX idx_sellers_bank_details_gin ON sellers USING GIN(bank_details);');
    
    console.log('✅ Indexes created');

    // Create supporting tables
    console.log('🔄 Creating supporting tables...');
    
    // Seller notifications
    await db.raw(`
CREATE TABLE seller_notifications (
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
);`);

    // Seller category requests
    await db.raw(`
CREATE TABLE seller_category_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`);

    // Seller brand requests
    await db.raw(`
CREATE TABLE seller_brand_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`);

    console.log('✅ Supporting tables created');

    // Create indexes for supporting tables
    console.log('🔄 Creating indexes for supporting tables...');
    await db.raw('CREATE INDEX idx_seller_notifications_seller_id ON seller_notifications(seller_id);');
    await db.raw('CREATE INDEX idx_seller_notifications_is_read ON seller_notifications(is_read);');
    await db.raw('CREATE INDEX idx_seller_category_requests_seller_id ON seller_category_requests(seller_id);');
    await db.raw('CREATE INDEX idx_seller_category_requests_status ON seller_category_requests(status);');
    await db.raw('CREATE INDEX idx_seller_brand_requests_seller_id ON seller_brand_requests(seller_id);');
    await db.raw('CREATE INDEX idx_seller_brand_requests_status ON seller_brand_requests(status);');
    
    console.log('✅ Supporting table indexes created');

    // Create triggers
    console.log('🔄 Creating triggers...');
    await db.raw(`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';`);

    await db.raw('CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();');
    await db.raw('CREATE TRIGGER update_seller_notifications_updated_at BEFORE UPDATE ON seller_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();');
    await db.raw('CREATE TRIGGER update_seller_category_requests_updated_at BEFORE UPDATE ON seller_category_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();');
    await db.raw('CREATE TRIGGER update_seller_brand_requests_updated_at BEFORE UPDATE ON seller_brand_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();');
    
    console.log('✅ Triggers created');

    // Verify the table structure
    console.log('🔍 Verifying table structure...');
    const tableInfo = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sellers' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Sellers table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    console.log('\n🎉 Database setup completed successfully!');
    console.log('📝 You can now test the seller registration API');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.destroy();
    console.log('🔌 Database connection closed');
  }
}

dropAndCreateSellers();