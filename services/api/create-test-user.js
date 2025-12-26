// Script to create a test user and provide login credentials
const axios = require('axios');

async function createTestUser() {
  const baseUrl = 'http://localhost:3000';
  const testUser = {
    fullName: 'Test Dashboard User',
    mobile: '8888888888',
    email: 'dashboard@test.com',
    password: 'TestDashboard123!'
  };
  
  try {
    console.log('Creating test user for dashboard testing...\n');
    
    // Step 1: Register
    console.log('1. Registering test user...');
    console.log('   User details:', JSON.stringify(testUser, null, 2));
    
    const registerResponse = await axios.post(`${baseUrl}/api/v1/seller-registration/register`, testUser, {
      validateStatus: () => true
    });
    
    console.log('   Register Status:', registerResponse.status);
    
    if (registerResponse.status === 201) {
      const sessionId = registerResponse.data.sessionId;
      console.log('   ✅ Registration successful!');
      console.log('   Session ID:', sessionId);
      console.log('\n📱 CHECK SERVER LOGS FOR OTP!');
      console.log('   Look for: "Your ShamBit registration OTP is: XXXXXX"');
      console.log('\n2. After you get the OTP from server logs, run this command:');
      console.log(`   curl -X POST ${baseUrl}/api/v1/seller-registration/verify-otp \\`);
      console.log(`        -H "Content-Type: application/json" \\`);
      console.log(`        -d '{"sessionId":"${sessionId}","otp":"YOUR_OTP_HERE"}'`);
      console.log('\n3. Then you can login with:');
      console.log(`   Mobile: ${testUser.mobile}`);
      console.log(`   Password: ${testUser.password}`);
      console.log('\n4. Test the complete flow with:');
      console.log('   node test-complete-flow.js');
      
    } else {
      console.log('   ❌ Registration failed');
      console.log('   Response:', JSON.stringify(registerResponse.data, null, 2));
      
      if (registerResponse.status === 409) {
        console.log('\n   User already exists! You can try to login with:');
        console.log(`   Mobile: ${testUser.mobile}`);
        console.log(`   Password: ${testUser.password}`);
      }
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

createTestUser();