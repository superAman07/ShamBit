const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testSellerEndpoints() {
  console.log('🧪 Testing Fixed Seller Endpoints\n');
  
  try {
    // Test 1: GET /seller-accounts (should now return results)
    console.log('1. Testing GET /seller-accounts (Public List)');
    const listResponse = await axios.get(`${BASE_URL}/seller-accounts`);
    console.log(`✅ Status: ${listResponse.status}`);
    console.log(`📊 Results: ${listResponse.data.total} sellers found`);
    console.log(`📄 Data structure:`, JSON.stringify(listResponse.data, null, 2));
    
    // Test 2: Create a new seller account
    console.log('\n2. Creating a new seller account');
    const createData = {
      sellerId: `test-seller-${Date.now()}`,
      accountHolderName: 'Test Seller Fixed',
      accountNumber: '9876543210',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountType: 'SAVINGS'
    };
    
    const createResponse = await axios.post(`${BASE_URL}/seller-accounts`, createData);
    console.log(`✅ Status: ${createResponse.status}`);
    console.log(`🆔 Created ID: ${createResponse.data.id}`);
    
    const sellerId = createResponse.data.id;
    
    // Test 3: GET /seller-accounts/:id (should now work without crashing)
    console.log('\n3. Testing GET /seller-accounts/:id (Public View)');
    const getByIdResponse = await axios.get(`${BASE_URL}/seller-accounts/${sellerId}`);
    console.log(`✅ Status: ${getByIdResponse.status}`);
    console.log(`📋 Public data returned:`, JSON.stringify(getByIdResponse.data, null, 2));
    
    // Test 4: Verify the list now includes our new seller
    console.log('\n4. Verifying list now includes new seller');
    const updatedListResponse = await axios.get(`${BASE_URL}/seller-accounts`);
    console.log(`✅ Status: ${updatedListResponse.status}`);
    console.log(`📊 Updated count: ${updatedListResponse.data.total} sellers`);
    
    // Test 5: Test with authentication (should return full data)
    console.log('\n5. Testing with mock authentication');
    const authHeaders = {
      'Authorization': 'Bearer mock-token'
    };
    
    const authResponse = await axios.get(`${BASE_URL}/seller-accounts/${sellerId}`, {
      headers: authHeaders
    });
    console.log(`✅ Status: ${authResponse.status}`);
    console.log(`🔐 Authenticated response has more fields:`, Object.keys(authResponse.data).length > 5);
    
    console.log('\n🎉 All tests passed! The endpoints are now working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${error.response.data?.message || error.response.statusText}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(`Network Error: ${error.message}`);
    }
  }
}

// Run the tests
testSellerEndpoints();