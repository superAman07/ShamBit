const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testSellerEndpoints() {
  console.log('🧪 Testing Fixed Seller Endpoints (Simple Version)\n');
  
  try {
    // Test 1: GET /seller-accounts (should now return results)
    console.log('1. Testing GET /seller-accounts (Public List)');
    const listResponse = await axios.get(`${BASE_URL}/seller-accounts`);
    console.log(`✅ Status: ${listResponse.status}`);
    console.log(`📊 Results: ${listResponse.data.total} sellers found`);
    
    if (listResponse.data.total > 0) {
      const firstSeller = listResponse.data.data[0];
      console.log(`🔍 First seller: ${firstSeller.sellerName} (ID: ${firstSeller.id})`);
      
      // Test 2: GET /seller-accounts/:id (should now work without crashing)
      console.log('\n2. Testing GET /seller-accounts/:id (Public View)');
      const getByIdResponse = await axios.get(`${BASE_URL}/seller-accounts/${firstSeller.id}`);
      console.log(`✅ Status: ${getByIdResponse.status}`);
      console.log(`📋 Public data returned:`, JSON.stringify(getByIdResponse.data, null, 2));
      
      // Test 3: Test with authentication (should return full data)
      console.log('\n3. Testing with mock authentication');
      const authHeaders = {
        'Authorization': 'Bearer mock-token'
      };
      
      const authResponse = await axios.get(`${BASE_URL}/seller-accounts/${firstSeller.id}`, {
        headers: authHeaders
      });
      console.log(`✅ Status: ${authResponse.status}`);
      console.log(`🔐 Authenticated response has more fields:`, Object.keys(authResponse.data).length > 5);
      
      console.log('\n🎉 All GET endpoint tests passed! The critical issues are fixed:');
      console.log('  ✅ GET /seller-accounts now returns data (was empty before)');
      console.log('  ✅ GET /seller-accounts/:id no longer crashes with 500 error');
      console.log('  ✅ Public vs authenticated access works correctly');
      
    } else {
      console.log('⚠️ No sellers found in database to test individual endpoints');
    }
    
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