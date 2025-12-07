const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'shambit_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verifySchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying Customer Management Schema...\n');

    // Check users table columns
    console.log('📋 Users Table - New Columns:');
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name IN ('verification_status', 'is_blocked', 'last_login_at')
      ORDER BY column_name
    `);
    console.table(usersColumns.rows);

    // Check users table indexes
    console.log('\n📊 Users Table - Indexes:');
    const usersIndexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users' 
        AND indexname IN ('users_verification_status_index', 'users_is_blocked_index')
      ORDER BY indexname
    `);
    console.table(usersIndexes.rows);

    // Check users table constraints
    console.log('\n🔒 Users Table - Constraints:');
    const usersConstraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND conname = 'check_verification_status'
    `);
    console.table(usersConstraints.rows);

    // Check customer_notes table
    console.log('\n📝 Customer Notes Table - Structure:');
    const notesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customer_notes'
      ORDER BY ordinal_position
    `);
    console.table(notesColumns.rows);

    console.log('\n📊 Customer Notes Table - Indexes:');
    const notesIndexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'customer_notes'
      ORDER BY indexname
    `);
    console.table(notesIndexes.rows);

    console.log('\n🔒 Customer Notes Table - Constraints:');
    const notesConstraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'customer_notes'::regclass
        AND conname = 'check_note_text_length'
    `);
    console.table(notesConstraints.rows);

    // Check customer_activity_log table
    console.log('\n📜 Customer Activity Log Table - Structure:');
    const activityColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customer_activity_log'
      ORDER BY ordinal_position
    `);
    console.table(activityColumns.rows);

    console.log('\n📊 Customer Activity Log Table - Indexes:');
    const activityIndexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'customer_activity_log'
      ORDER BY indexname
    `);
    console.table(activityIndexes.rows);

    console.log('\n✅ Schema verification complete!');
  } catch (error) {
    console.error('❌ Error verifying schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema();
