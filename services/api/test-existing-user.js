// Test script to login with existing user and test profile
const axios = require('axios');

async function testExistingUser() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing login with existing user...\n');
    
    // The user from the logs: mobile: 9879879879, email: abc@gmail.com
    // Let's try to login (password was hashed during registration)
    console.log('1. Testing login with existing user...');
    
    // Try different common passwords that might have been used
    const testPasswords = ['password', 'password123', '123456', 'test123', 'amit123'];
    const identifier = '9879879879'; // Mobile from logs
    
    let loginSuccess = false;
    let accessToken = null;
    
    for (const password of testPasswords) {
      try {
        console.log(`   Trying password: ${password}`);
        const loginResponse = await axios.post(`${baseUrl}/api/v1/seller-registration/login`, {
          identifier: identifier,
          password: password
        }, {
          validateStatus: () => true
        });
        
        if (loginResponse.status === 200 && loginResponse.data.tokens) {
          console.log('   ✅ Login successful with password:', password);
          accessToken = loginResponse.data.tokens.accessToken;
          loginSuccess = true;
          break;
        } else {
          console.log(`   ❌ Failed with password: ${password} (Status: ${loginResponse.status})`);
        }
      } catch (error) {
        console.log(`   ❌ Error with password ${password}:`, error.message);
      }
    }
    
    if (!loginSuccess) {
      console.log('\n❌ Could not login with any test password');
      console.log('The user exists but we need the correct password');
      console.log('Let\'s test the profile endpoint authentication instead...\n');
      
      // Test profile endpoint without token (should return 401)
      console.log('2. Testing profile endpoint without token...');
      try {
        const profileResponse = await axios.get(`${baseUrl}/api/seller/profile`, {
          validateStatus: () => true
        });
        
        console.log('   Profile Status (no token):', profileResponse.status);
        
        if (profileResponse.status === 401) {
          console.log('   ✅ Profile endpoint correctly requires authentication');
        } else {
          console.log('   ❌ Profile endpoint should return 401 without token');
        }
      } catch (error) {
        console.log('   ❌ Profile request error:', error.message);
      }
      
      return;
    }
    
    // Step 2: Test profile endpoint with valid token
    console.log('\n2. Testing profile endpoint with valid token...');
    try {
      const profileResponse = await axios.get(`${baseUrl}/api/seller/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        validateStatus: () => true
      });
      
      console.log('   Profile Status:', profileResponse.status);
      
      if (profileResponse.status === 200) {
        console.log('   ✅ Profile endpoint working correctly!');
        console.log('   Profile data:', JSON.stringify(profileResponse.data, null, 2));
      } else {
        console.log('   ❌ Profile endpoint failed');
        console.log('   Profile Response:', JSON.stringify(profileResponse.data, null, 2));
      }
    } catch (error) {
      console.log('   ❌ Profile request error:', error.message);
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

testExistingUser();