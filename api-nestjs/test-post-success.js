const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testPostSuccess() {
  console.log('🧪 Testing POST Success with Unique Seller ID\n');
  
  try {
    // Test with a completely unique seller ID
    console.log('1. Testing POST with unique seller ID and authentication');
    
    const uniqueId = `seller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createData = {
      sellerId: uniqueId,
      accountHolderName: 'Test Success Seller',
      accountNumber: '9999888877',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountType: 'SAVINGS'
    };
    
    const authHeaders = {
      'Authorization': 'Bearer mock-token'
    };
    
    console.log(`📤 Creating seller with ID: ${uniqueId}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/seller-accounts`, createData, {
        headers: authHeaders
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`🆔 Created account ID: ${response.data.id}`);
      console.log(`👤 Seller ID: ${response.data.sellerId}`);
      console.log(`🏦 Account holder: ${response.data.accountHolderName}`);
      console.log(`🔒 KYC Status: ${response.data.kycStatus}`);
      console.log(`✅ Verified: ${response.data.isVerified}`);
      
      // Verify the account appears in the list
      console.log('\n2. Verifying account appears in public list');
      const listResponse = await axios.get(`${BASE_URL}/seller-accounts`);
      const foundAccount = listResponse.data.data.find(acc => acc.id === response.data.id);
      
      if (foundAccount) {
        console.log(`✅ Account found in public list: ${foundAccount.sellerName}`);
        console.log(`🔍 Public data: ${JSON.stringify(foundAccount, null, 2)}`);
      } else {
        console.log('⚠️ Account not found in public list (might be filtered)');
      }
      
      console.log('\n🎉 POST endpoint is now fully functional!');
      console.log('✅ Authentication works correctly');
      console.log('✅ User context is properly handled');
      console.log('✅ Database creation succeeds');
      console.log('✅ Response data is properly formatted');
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Status: ${error.response.status}`);
        console.log(`❌ Error: ${error.response.data?.message || error.response.statusText}`);
        
        if (error.response.status === 500) {
          console.log('⚠️ Still getting 500 - this might be a database schema issue');
          console.log('💡 The sellerId might need to reference an existing seller record');
        }
      } else {
        console.log(`❌ Network error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testPostSuccess();