const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the database connection from the packages
const { initializeDatabase } = require('./packages/database/dist/postgres');

async function runComprehensiveMigration() {
  console.log('🚀 Starting comprehensive seller migration...');
  
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

    // Read and run the comprehensive migration
    console.log('📄 Reading comprehensive migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'services/api/migrations/update_sellers_table_comprehensive.sql'),
      'utf8'
    );

    console.log('🔄 Running comprehensive seller migration...');
    await db.raw(migrationSQL);
    console.log('✅ Comprehensive seller migration completed successfully!');

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

    console.log('\n🎉 Migration completed successfully!');
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

runComprehensiveMigration();