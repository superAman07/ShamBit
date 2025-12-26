const { initializeDatabase, getDatabase } = require('@shambit/database');
const { loadConfig } = require('@shambit/config');

async function checkSellerData() {
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
    // Get a test user with all fields
    const user = await db('sellers')
      .select('*')
      .first();
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('Checking seller data for potential JSON parsing issues...');
    console.log('User ID:', user.id);
    console.log('Full Name:', user.full_name);
    
    // Check JSON fields that might cause parsing issues
    const jsonFields = [
      'registered_business_address',
      'warehouse_addresses', 
      'bank_details',
      'documents'
    ];
    
    jsonFields.forEach(field => {
      const value = user[field];
      console.log(`\n${field}:`);
      console.log('  Type:', typeof value);
      console.log('  Value:', value);
      
      if (value) {
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            console.log('  ✅ Valid JSON string');
            console.log('  Parsed type:', typeof parsed);
          } catch (e) {
            console.log('  ❌ Invalid JSON string:', e.message);
          }
        } else if (typeof value === 'object') {
          console.log('  ✅ Already an object');
        }
      } else {
        console.log('  ✅ Null/undefined (no parsing needed)');
      }
    });
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkSellerData();