const axios = require('axios');

async function testBusinessEndpoint() {
  try {
    // First, let's test the test endpoint to make sure the server is responding
    console.log('Testing server connectivity...');
    const testResponse = await axios.get('http://localhost:3000/api/v1/seller/test');
    console.log('✅ Server is responding:', testResponse.data);
    
    // Test the business endpoint (this will fail without auth, but we'll see a different error)
    console.log('\nTesting business endpoint without auth...');
    try {
      const businessResponse = await axios.put('http://localhost:3000/api/v1/seller/profile/business', {
        businessName: 'Test Business',
        businessType: 'individual',
        natureOfBusiness: 'Test Nature',
        yearOfEstablishment: 2020,
        primaryProductCategories: 'Electronics'
      });
      console.log('✅ Business endpoint response:', businessResponse.data);
    } catch (authError) {
      if (authError.response && authError.response.status === 401) {
        console.log('✅ Business endpoint is working (got expected 401 auth error)');
        console.log('Response:', authError.response.data);
      } else {
        console.log('❌ Unexpected error:', authError.response?.data || authError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.response?.data || error.message);
  }
}

testBusinessEndpoint();