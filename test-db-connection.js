const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shambit_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Aryan21@!',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database successfully');

    // Check if otp_records table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'otp_records'
      );
    `);
    
    console.log('OTP records table exists:', result.rows[0].exists);
    
    if (!result.rows[0].exists) {
      console.log('Creating OTP records table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS otp_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier VARCHAR(255) NOT NULL,
          otp VARCHAR(10) NOT NULL,
          purpose VARCHAR(50) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_otp_records_identifier_purpose ON otp_records(identifier, purpose);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_otp_records_expires_at ON otp_records(expires_at);
      `);
      
      console.log('✓ OTP records table created successfully');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();