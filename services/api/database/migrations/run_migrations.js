const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shambit_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Run comprehensive sellers table migration
    console.log('\n=== Running update_sellers_table_comprehensive.sql ===');
    const comprehensiveSellersMigration = fs.readFileSync(
      path.join(__dirname, 'update_sellers_table_comprehensive.sql'),
      'utf8'
    );
    await client.query(comprehensiveSellersMigration);
    console.log('✓ Comprehensive sellers table migration completed');

    // Run create_support_tables.sql
    console.log('\n=== Running create_support_tables.sql ===');
    const supportTablesMigration = fs.readFileSync(
      path.join(__dirname, 'create_support_tables.sql'),
      'utf8'
    );
    await client.query(supportTablesMigration);
    console.log('✓ Support tables migration completed');

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();