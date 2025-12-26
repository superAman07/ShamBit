const { initializeDatabase, getDatabase } = require('@shambit/database');
const { loadConfig } = require('@shambit/config');

async function checkUsers() {
  // Load configuration and initialize database
  const config = loadConfig();
  initializeDatabase({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    poolMin: config.DB_POOL_MIN,
    poolMax: config.DB_POOL_MAX,
  });
  
  const db = getDatabase();
  
  try {
    const users = await db('sellers')
      .select('id', 'full_name', 'email', 'mobile', 'email_verified', 'mobile_verified', 'overall_verification_status')
      .limit(5);
    
    console.log('Found users:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.full_name}, Email: ${user.email}, Mobile: ${user.mobile}`);
      console.log(`  Email Verified: ${user.email_verified}, Mobile Verified: ${user.mobile_verified}`);
      console.log(`  Status: ${user.overall_verification_status}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('No users found in database');
    }
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers();