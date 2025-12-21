const fetch = require('node-fetch');

async function debugRegistrationValidation() {
  console.log('🔍 Debugging Registration Validation...\n');

  // Minimal valid test data
  const testData = {
    // Part A: Personal Details
    fullName: 'John Doe',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    mobile: '9123456789',
    email: 'test' + Date.now() + '@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    
    // Part B: Business Information
    sellerType: 'individual',
    primaryProductCategories: 'Electronics and mobile accessories for retail customers',
    estimatedMonthlyOrderVolume: '51-200',
    preferredPickupTimeSlots: '9:00 AM - 6:00 PM, Monday to Saturday',
    maxOrderProcessingTime: 2,
    
    // Part C: Address Information
    registeredBusinessAddress: {
      addressLine1: '123 Business Street, Near City Center',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001'
    },
    warehouseAddresses: [{
      isPrimary: true,
      sameAsRegistered: true,
      addressLine1: '123 Business Street, Near City Center',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001'
    }],
    
    // Part D: Tax & Compliance Details
    gstRegistered: false,
    panNumber: 'ABCDE1234F',
    panHolderName: 'John Doe',
    tdsApplicable: false,
    
    // Part E: Bank Account Details
    bankDetails: {
      accountHolderName: 'John Doe',
      bankName: 'State Bank of India',
      accountNumber: '1234567890123456',
      confirmAccountNumber: '1234567890123456',
      ifscCode: 'SBIN0001234',
      accountType: 'savings'
    },
    
    // Verification Status
    mobileVerified: false,
    emailVerified: false,
    
    // Financial Terms & Agreements
    commissionRateAccepted: true,
    paymentSettlementTermsAccepted: true,
    
    // Legal Declarations & Agreements
    termsAndConditionsAccepted: true,
    returnPolicyAccepted: true,
    dataComplianceAccepted: true,
    privacyPolicyAccepted: true
  };

  try {
    console.log('📝 Sending registration request...');
    console.log('Data being sent:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/v1/sellers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Registration successful!');
    } else {
      console.log('\n❌ Registration failed');
      if (result.errors) {
        console.log('\n🔍 Validation Errors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.field}: ${error.message}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

debugRegistrationValidation();