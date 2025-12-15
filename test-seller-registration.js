// Test script to register a seller via API
const fetch = require('node-fetch');

const testSellerData = {
  businessName: "Green Grocers",
  businessType: "grocery",
  gstin: "27ABCDE5678F1Z9",
  ownerName: "Priya Sharma",
  phone: "9876543211",
  email: "priya@greengrocers.com",
  city: "Delhi"
};

async function testSellerRegistration() {
  try {
    console.log('Testing seller registration...');
    console.log('Seller data:', JSON.stringify(testSellerData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/v1/sellers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSellerData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Seller registration successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Seller registration failed!');
      console.log('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testSellerRegistration();