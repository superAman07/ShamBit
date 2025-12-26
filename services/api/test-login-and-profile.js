// Test script to verify login and profile functionality
const axios = require('axios');

async function testLoginAndProfile() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing login and profile flow...\n');
    
    // Test 1: Login with the registered user
    console.log('1. Testing login...');
    try {
      const loginResponse = await axios.post(`${baseUrl}/api/v1/seller-registration/login`, {
        identifier: '9879879879', // Use the mobile from the logs
        password: 'password123'   // Use a test password
      }, {
        validateStatus: () => true
      });
      
      console.log('   Login Status:', loginResponse.status);
      console.log('   Login Response:', JSON.stringify(loginResponse.data, null, 2));
      
      if (loginResponse.status === 200 && loginResponse.data.tokens) {
        const accessToken = loginResponse.data.tokens.accessToken;
        console.log('   ✅ Login successful, got access token\n');
        
        // Test 2: Use the token to get profile
        console.log('2. Testing profile with token...');
        try {
          const profileResponse = await axios.get(`${baseUrl}/api/seller/profile`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            validateStatus: () => true
          });
          
          console.log('   Profile Status:', profileResponse.status);
          console.log('   Profile Response:', JSON.stringify(profileResponse.data, null, 2));
          
          if (profileResponse.status === 200) {
            console.log('   ✅ Profile endpoint working correctly\n');
          } else {
            console.log('   ❌ Profile endpoint failed\n');
          }
        } catch (error) {
          console.log('   ❌ Profile request error:', error.message, '\n');
        }
        
      } else {
        console.log('   ❌ Login failed\n');
      }
    } catch (error) {
      console.log('   ❌ Login error:', error.message, '\n');
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

testLoginAndProfile();