// Simple test script to verify the seller profile endpoint
const axios = require('axios');

async function testSellerEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing seller endpoints...\n');
    
    // Test 1: Basic routing test
    console.log('1. Testing basic routing...');
    try {
      const testResponse = await axios.get(`${baseUrl}/api/seller/test`, {
        validateStatus: () => true
      });
      console.log('   Status:', testResponse.status);
      console.log('   Response:', testResponse.data);
      
      if (testResponse.status === 200) {
        console.log('   ✅ Basic routing works\n');
      } else {
        console.log('   ❌ Basic routing failed\n');
      }
    } catch (error) {
      console.log('   ❌ Basic routing error:', error.message, '\n');
    }
    
    // Test 2: Authentication test (should return 401)
    console.log('2. Testing authentication requirement...');
    try {
      const authResponse = await axios.get(`${baseUrl}/api/seller/profile`, {
        validateStatus: () => true
      });
      console.log('   Status:', authResponse.status);
      console.log('   Response:', authResponse.data);
      
      if (authResponse.status === 401) {
        console.log('   ✅ Authentication properly required\n');
      } else {
        console.log('   ❌ Authentication not working as expected\n');
      }
    } catch (error) {
      console.log('   ❌ Authentication test error:', error.message, '\n');
    }
    
    // Test 3: Auth test endpoint
    console.log('3. Testing auth-test endpoint...');
    try {
      const authTestResponse = await axios.get(`${baseUrl}/api/seller/auth-test`, {
        validateStatus: () => true
      });
      console.log('   Status:', authTestResponse.status);
      console.log('   Response:', authTestResponse.data);
      
      if (authTestResponse.status === 401) {
        console.log('   ✅ Auth test endpoint properly requires authentication\n');
      } else {
        console.log('   ❌ Auth test endpoint issue\n');
      }
    } catch (error) {
      console.log('   ❌ Auth test error:', error.message, '\n');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on localhost:3000');
      console.log('   Please start the server with: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSellerEndpoints();