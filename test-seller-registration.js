// Test script for seller registration flow
// Run with: node test-seller-registration.js

const baseUrl = 'http://localhost:3000/api/v1';

// Test data
const testSeller = {
  fullName: 'Test Seller',
  mobile: '9876543210',
  email: 'testseller@example.com',
  password: 'TestPassword123!'
};

async function testRegistration() {
  console.log('🧪 Testing Seller Registration Flow\n');

  try {
    // Step 1: Register seller
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

    console.log('✅ Registration successful\n');

    // Step 2: Get OTP from console logs (since SMS is not configured)
    console.log('2️⃣ Check your server logs for the OTP and enter it below');
    console.log('   Look for: "Your ShamBit verification OTP is: XXXXXX"\n');

    // For testing, we'll use a placeholder OTP
    // In real testing, you'd get this from the server logs
    const testOtp = '123456'; // Replace with actual OTP from logs

    // Step 3: Verify OTP and complete registration
    console.log('3️⃣ Testing OTP verification...');
    const verifyResponse = await fetch(`${baseUrl}/seller-registration/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: testSeller.mobile,
        otp: testOtp,
        fullName: testSeller.fullName,
        email: testSeller.email,
        password: testSeller.password
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('OTP Verification Response:', JSON.stringify(verifyData, null, 2));

    if (!verifyData.success) {
      console.error('❌ OTP verification failed');
      return;
    }

    console.log('✅ OTP verification successful');
    const accessToken = verifyData.data.tokens.accessToken;
    console.log('🔑 Access token received\n');

    // Step 4: Test login
    console.log('4️⃣ Testing login...');
    const loginResponse = await fetch(`${baseUrl}/seller-registration/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testSeller.email,
        password: testSeller.password
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }

    console.log('✅ Login successful\n');

    // Step 5: Test profile completion
    console.log('5️⃣ Testing profile completion...');
    const profileResponse = await fetch(`${baseUrl}/seller-registration/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        dateOfBirth: '1990-01-01',
        gender: 'male',
        panNumber: 'ABCDE1234F',
        panHolderName: testSeller.fullName,
        businessAddress: {
          addressLine1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          pinCode: '123456'
        },
        primaryProductCategories: 'Electronics, Books'
      })
    });

    const profileData = await profileResponse.json();
    console.log('Profile Completion Response:', JSON.stringify(profileData, null, 2));

    if (!profileData.success) {
      console.error('❌ Profile completion failed');
      return;
    }

    console.log('✅ Profile completion successful');
    console.log('\n🎉 All tests passed! Seller registration flow is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Manual testing instructions
console.log(`
📋 MANUAL TESTING INSTRUCTIONS:

1. Make sure your server is running on port 3000
2. Update the testSeller object above with unique email/mobile
3. Run this script: node test-seller-registration.js
4. When prompted, check your server logs for the OTP
5. Update the testOtp variable with the actual OTP from logs
6. Re-run the script

🔧 CURL COMMANDS FOR MANUAL TESTING:

# 1. Register
curl -X POST ${baseUrl}/seller-registration/register \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testSeller)}'

# 2. Verify OTP (replace OTP_FROM_LOGS with actual OTP)
curl -X POST ${baseUrl}/seller-registration/verify-otp \\
  -H "Content-Type: application/json" \\
  -d '{
    "mobile": "${testSeller.mobile}",
    "otp": "OTP_FROM_LOGS",
    "fullName": "${testSeller.fullName}",
    "email": "${testSeller.email}",
    "password": "${testSeller.password}"
  }'

# 3. Login
curl -X POST ${baseUrl}/seller-registration/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${testSeller.email}",
    "password": "${testSeller.password}"
  }'
`);

// Run the test if this file is executed directly
if (require.main === module) {
  testRegistration();
}