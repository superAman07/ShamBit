const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/seller-registration';

async function testAuthEndpoints() {
  console.log('Testing Authentication Endpoints...\n');

  try {
    // Test 1: Login with non-existent user (should fail)
    console.log('1. Testing login with non-existent user...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/login`, {
        identifier: 'nonexistent@example.com',
        password: 'testpassword',
        ipAddress: '127.0.0.1'
      });
      console.log('❌ Expected login to fail, but it succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login correctly failed for non-existent user');
        console.log('   Error:', error.response.data.error?.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data || error.message);
      }
    }

    // Test 2: Check if we have any existing sellers to test with
    console.log('\n2. Testing with existing seller data...');
    
    // Let's try to register first, but handle if user already exists
    try {
      const registerResponse = await axios.post(`${API_BASE}/register`, {
        fullName: 'Test Seller Auth',
        mobile: '9876543210',
        email: 'testauth@example.com',
        password: 'TestPassword123!',
        ipAddress: '127.0.0.1'
      });
      
      if (registerResponse.data.success) {
        console.log('✅ New seller registered successfully');
        console.log('   Seller ID:', registerResponse.data.data.seller.id);
        console.log('   OTP sent for verification');
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Seller already exists (expected for duplicate registration)');
        console.log('   Error:', error.response.data.error?.message);
      } else {
        console.log('❌ Registration failed:', error.response?.status, error.response?.data || error.message);
      }
    }

    // Test 3: Try login with a test account (we'll create one manually if needed)
    console.log('\n3. Testing login functionality...');
    
    // First, let's see if we can create a verified seller directly in the database
    // For now, let's test the login endpoint structure
    try {
      const loginResponse = await axios.post(`${API_BASE}/login`, {
        identifier: 'testauth@example.com',
        password: 'TestPassword123!',
        ipAddress: '127.0.0.1'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful');
        console.log('   Access token received:', !!loginResponse.data.data.tokens.accessToken);
        console.log('   Refresh token received:', !!loginResponse.data.data.tokens.refreshToken);
        
        const { accessToken, refreshToken } = loginResponse.data.data.tokens;
        
        // Test 4: Test token refresh
        console.log('\n4. Testing token refresh...');
        try {
          const refreshResponse = await axios.post(`${API_BASE}/refresh-token`, {
            refreshToken: refreshToken,
            ipAddress: '127.0.0.1'
          });
          
          if (refreshResponse.data.success) {
            console.log('✅ Token refresh successful');
            console.log('   New access token received:', !!refreshResponse.data.data.tokens.accessToken);
            console.log('   New refresh token received:', !!refreshResponse.data.data.tokens.refreshToken);
          }
        } catch (error) {
          console.log('❌ Token refresh failed:', error.response?.status, error.response?.data || error.message);
        }
        
        // Test 5: Test logout
        console.log('\n5. Testing logout...');
        try {
          const logoutResponse = await axios.post(`${API_BASE}/logout`, {
            refreshToken: refreshToken
          });
          
          if (logoutResponse.data.success) {
            console.log('✅ Logout successful');
          }
        } catch (error) {
          console.log('❌ Logout failed:', error.response?.status, error.response?.data || error.message);
        }
        
      } else {
        console.log('❌ Login failed:', loginResponse.data);
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.status, error.response?.data || error.message);
    }

  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
  }
}

testAuthEndpoints().catch(console.error);