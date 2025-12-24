const { Client } = require('pg');
require('dotenv').config();

async function clearSellersTable() {
  console.log('🗑️  Clearing sellers table for fresh testing...\n');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shambit_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Delete all sellers
    const deleteResult = await client.query('DELETE FROM sellers');
    console.log(`✅ Deleted ${deleteResult.rowCount} sellers from the table`);

    // Also clear related tables for a completely fresh start
    const sessionResult = await client.query('DELETE FROM seller_sessions');
    console.log(`✅ Deleted ${sessionResult.rowCount} seller sessions`);

    const registrationResult = await client.query('DELETE FROM registration_sessions');
    console.log(`✅ Deleted ${registrationResult.rowCount} registration sessions`);

    const otpResult = await client.query('DELETE FROM otp_records');
    console.log(`✅ Deleted ${otpResult.rowCount} OTP records`);

    const auditResult = await client.query('DELETE FROM seller_audit_logs');
    console.log(`✅ Deleted ${auditResult.rowCount} audit log entries`);

    console.log('\n🎉 Database cleared successfully! Ready for fresh testing.');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure PostgreSQL is running and the connection details are correct.');
      console.log('💡 Check your .env file for database configuration.');
    }
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

// Run the cleanup
clearSellersTable().catch(console.error);