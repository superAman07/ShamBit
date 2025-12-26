const { initializeDatabase, getDatabase } = require('@shambit/database');
const { loadConfig } = require('@shambit/config');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testProfileWithToken() {
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
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Get a test user
    const user = await db('sellers')
      .select('id', 'full_name', 'email', 'mobile')
      .first();
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('Testing profile endpoint with user:', user.full_name);
    console.log('User ID:', user.id);
    
    // Generate a JWT token for this user
    const token = jwt.sign(
      {
        sellerId: user.id,
        email: user.email,
        type: 'seller'
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Generated JWT token');
    
    // Test the profile endpoint
    console.log('\n1. Testing /api/seller/profile endpoint...');
    
    const response = await axios.get(`${baseUrl}/api/seller/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    
    console.log('   Status:', response.status);
    
    if (response.status === 200) {
      console.log('   ✅ Profile endpoint working!');
      console.log('   Full response:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('   ❌ Profile endpoint failed');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3000');
      console.log('   Please start the server with: npm run dev');
    } else {
      console.error('Error:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } finally {
    process.exit(0);
  }
}

testProfileWithToken();