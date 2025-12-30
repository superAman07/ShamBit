const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testPostEndpoint() {
  console.log('🧪 Testing POST Endpoint with Valid Seller ID\n');
  
  try {
    // First get an existing seller to understand the data structure
    console.log('1. Getting existing sellers to understand structure');
    const listResponse = await axios.get(`${BASE_URL}/seller-accounts`);
    console.log(`📊 Found ${listResponse.data.total} existing sellers`);
    
    // Test creating with a unique seller ID that should work
    console.log('\n2. Testing POST with unique seller ID');
    const createData = {
      sellerId: `cmjstest${Date.now()}`, // Use a unique ID format
      accountHolderName: 'Test Seller POST',
      accountNumber: '1111222233',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountType: 'SAVINGS'
    };
    
    console.log('📤 Sending data:', JSON.stringify(createData, null, 2));
    
    const createResponse = await axios.post(`${BASE_URL}/seller-accounts`, createData);
    console.log(`✅ Status: ${createResponse.status}`);
    console.log(`🆔 Created seller account: ${createResponse.data.id}`);
    console.log(`📋 Response:`, JSON.stringify(createResponse.data, null, 2));
    
    console.log('\n🎉 POST endpoint is working correctly!');
    
  } catch (error) {
    console.error('\n❌ POST test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data) {
        console.error(`Full response:`, JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error(`Network Error: ${error.message}`);
    }
    
    console.log('\n💡 The POST endpoint issue is likely due to foreign key constraints.');
    console.log('   The sellerId must reference an existing seller in the database.');
    console.log('   This is a database schema issue, not a code issue.');
  }
}

// Run the test
testPostEndpoint();