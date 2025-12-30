const axios = require('axios');

// Simple test to verify the security implementation
async function testAuthSecurity() {
  const API_BASE = 'http://localhost:3001/api/v1';
  
  console.log('🔒 Testing Authentication Security Implementation\n');
  
  try {
    // Test 1: Check if server is running and security headers are present
    console.log('1. Testing server and security headers...');
    const healthCheck = await axios.get(`${API_BASE}/../health`, {
      validateStatus: () => true
    });
    
    if (healthCheck.status === 200) {
      console.log('   ✅ Server is running');
    } else {
      console.log('   ❌ Server is not running. Please start with: npm run start:dev');
      return;
    }
    
    // Test 2: Try accessing protected route without authentication
    console.log('\n2. Testing protected route without authentication...');
    try {
      await axios.get(`${API_BASE}/auth/me`);
      console.log('   ❌ Protected route should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   ✅ Protected route properly requires authentication');
      } else {
        console.log('   ⚠ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Check security headers
    console.log('\n3. Checking security headers...');
    const response = await axios.get(`${API_BASE}/auth/me`, {
      validateStatus: () => true
    });
    
    const headers = response.headers;
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security'
    ];
    
    securityHeaders.forEach(header => {
      if (headers[header]) {
        console.log(`   ✅ ${header}: ${headers[header]}`);
      } else {
        console.log(`   ⚠ ${header}: Not found`);
      }
    });
    
    console.log('\n✅ Basic security tests completed!');
    console.log('\nTo run comprehensive security tests:');
    console.log('1. Start the server: npm run start:dev');
    console.log('2. Run security tests: npm run test:security');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure the server is running: npm run start:dev');
  }
}

testAuthSecurity();