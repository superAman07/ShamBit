// Test script to verify the complete registration -> login -> profile flow
const axios = require('axios');

async function testFullFlow() {
  const baseUrl = 'http://localhost:3000';
  const testUser = {
    fullName: 'Test User',
    mobile: '9999999999',
    email: 'test@example.com',
    password: 'TestPassword123!'
  };
  
  try {
    console.log('Testing complete registration -> login -> profile flow...\n');
    
    // Step 1: Register
    console.log('1. Registering new user...');
    const registerResponse = await axios.post(`${baseUrl}/api/v1/seller-registration/register`, testUser, {
      validateStatus: () => true
    });
    
    console.log('   Register Status:', registerResponse.status);
    
    if (registerResponse.status !== 201) {
      console.log('   Register Response:', JSON.stringify(registerResponse.data, null, 2));
      console.log('   ❌ Registration failed\n');
      return;
    }
    
    const sessionId = registerResponse.data.sessionId;
    console.log('   ✅ Registration successful, sessionId:', sessionId);
    
    // Step 2: Get OTP from server logs (we'll use a dummy OTP for now)
    console.log('\n2. Verifying OTP (using dummy OTP - check server logs for real OTP)...');
    
    // Try common test OTPs
    const testOTPs = ['123456', '000000', '111111'];
    let otpVerified = false;
    let accessToken = null;
    
    for (const otp of testOTPs) {
      try {
        const otpResponse = await axios.post(`${baseUrl}/api/v1/seller-registration/verify-otp`, {
          sessionId: sessionId,
          otp: otp
        }, {
          validateStatus: () => true
        });
        
        if (otpResponse.status === 200) {
          console.log('   ✅ OTP verified with:', otp);
          accessToken = otpResponse.data.tokens?.accessToken;
          otpVerified = true;
          break;
        }
      } catch (error) {
        // Continue to next OTP
      }
    }
    
    if (!otpVerified) {
      console.log('   ❌ Could not verify OTP with test values');
      console.log('   Please check server logs for the actual OTP and run login test manually');
      return;
    }
    
    // Step 3: Test profile endpoint
    console.log('\n3. Testing profile endpoint with token...');
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

testFullFlow();