// Test the fixed registration flow
const baseUrl = 'http://localhost:3000/api/v1';

const testSeller = {
  fullName: 'Test User New',
  mobile: '9876543210',
  email: 'testuser@example.com',
  password: 'Test@12345'
};

async function testFixedRegistration() {
  console.log('🧪 Testing Fixed Registration Flow\n');

  try {
    // Step 1: Register seller (this will store data and send OTP)
    console.log('1️⃣ Testing registration...');
    const registerResponse = await fetch(`${baseUrl}/seller-registration/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSeller)
    });

    const registerData = await registerResponse.json();
    console.log('Registration Response:', JSON.stringify(registerData, null, 2));

    if (!registerData.success) {
      console.error('❌ Registration failed');
      return;
    }

    console.log('✅ Registration successful - OTP sent\n');

    // Step 2: Verify OTP (now only needs mobile and OTP)
    console.log('2️⃣ Testing OTP verification with just mobile and OTP...');
    
    // Get the OTP from your server logs (it should be 378472 based on your logs)
    const otp = '378472'; // Replace with actual OTP from logs
    
    const verifyResponse = await fetch(`${baseUrl}/seller-registration/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: testSeller.mobile,
        otp: otp
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('OTP Verification Response:', JSON.stringify(verifyData, null, 2));

    if (!verifyData.success) {
      console.error('❌ OTP verification failed');
      return;
    }

    console.log('✅ OTP verification successful - Account created!');
    console.log('🔑 Access token received:', verifyData.data.tokens.accessToken.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

console.log(`
📋 INSTRUCTIONS:

1. Make sure your server is running on port 3000
2. Run this script: node test-fixed-registration.js
3. Check your server logs for the OTP
4. Update the 'otp' variable above with the actual OTP
5. Re-run the script

The new flow only requires mobile and OTP for verification!
`);

// Run the test
testFixedRegistration();