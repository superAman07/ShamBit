const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testPostFix() {
  console.log('🧪 Testing POST Endpoint Fix\n');
  
  try {
    // Test 1: POST without authentication (should return 401)
    console.log('1. Testing POST without authentication');
    
    const createData = {
      sellerId: 'test-seller-fix',
      accountHolderName: 'Test POST Fix',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountType: 'SAVINGS'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/seller-accounts`, createData);
      console.log(`❌ Unexpected success: ${response.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ Correctly returns 401: ${error.response.data.message}`);
      } else {
        console.log(`⚠️ Unexpected status: ${error.response?.status}`);
      }
    }
    
    // Test 2: POST with authentication (should work or fail with proper error)
    console.log('\n2. Testing POST with authentication');
    
    const authHeaders = {
      'Authorization': 'Bearer mock-token'
    };
    
    try {
      const authResponse = await axios.post(`${BASE_URL}/seller-accounts`, createData, {
        headers: authHeaders
      });
      console.log(`✅ POST with auth successful: ${authResponse.status}`);
      console.log(`🆔 Created account: ${authResponse.data.id}`);
    } catch (error) {
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Error: ${error.response.data?.message || error.response.statusText}`);
        
        if (error.response.status === 500) {
          console.log('⚠️ Still getting 500 - checking if it\'s the user.roles issue or database constraint');
        } else if (error.response.status === 400) {
          console.log('ℹ️ This might be a database constraint issue (expected)');
        }
      } else {
        console.log(`❌ Network error: ${error.message}`);
      }
    }
    
    // Test 3: Verify GET endpoints still work
    console.log('\n3. Verifying GET endpoints still work');
    
    const listResponse = await axios.get(`${BASE_URL}/seller-accounts`);
    console.log(`✅ GET /seller-accounts: ${listResponse.status} (${listResponse.data.total} sellers)`);
    
    console.log('\n🎯 POST endpoint authentication and user handling test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testPostFix();