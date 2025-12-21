const fetch = require('node-fetch');

async function testOTPAPI() {
  try {
    console.log('Testing mobile OTP API...');
    
    const response = await fetch('http://localhost:3000/api/v1/sellers/verify-mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: '9876543210'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✓ OTP API is working correctly');
    } else {
      console.log('❌ OTP API failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing OTP API:', error.message);
  }
}

testOTPAPI();