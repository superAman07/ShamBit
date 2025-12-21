const fetch = require('node-fetch');

async function testSellerRegistrationFlow() {
  console.log('🧪 Testing Seller Registration Flow...\n');

  // Test data for a complete seller registration
  const testData = {
    // Step 1: Personal Details
    fullName: 'John Doe',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    mobile: '9876543210',
    email: 'john.doe@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    
    // Step 2: Business Information
    sellerType: 'business',
    businessType: 'proprietorship',
    businessName: 'John Doe Enterprises',
    natureOfBusiness: 'Electronics and gadgets retail business',
    primaryBusinessActivity: 'Retail Sales',
    yearOfEstablishment: 2020,
    businessPhone: '9876543211',
    businessEmail: 'business@johndoe.com',
    primaryProductCategories: 'Electronics, Mobile Accessories, Gadgets',
    estimatedMonthlyOrderVolume: '51-200',
    preferredPickupTimeSlots: '9:00 AM - 6:00 PM, Monday to Saturday',
    maxOrderProcessingTime: 2,
    
    // Step 3: Address Information
    registeredBusinessAddress: {
      addressLine1: '123 Business Street',
      addressLine2: 'Near City Center',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001'
    },
    warehouseAddresses: [{
      isPrimary: true,
      sameAsRegistered: true,
      addressLine1: '123 Business Street',
      addressLine2: 'Near City Center',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400001',
      contactPerson: 'John Doe',
      contactPhone: '9876543210',
      operatingHours: '9:00 AM - 6:00 PM',
      maxDeliveryRadius: 10
    }],
    
    // Step 4: Tax & Compliance Details
    gstRegistered: true,
    gstNumber: '27ABCDE1234F1Z5',
    panNumber: 'ABCDE1234F',
    panHolderName: 'John Doe',
    tdsApplicable: false,
    aadhaarNumber: '123456789012',
    
    // Step 5: Bank Account Details
    bankDetails: {
      accountHolderName: 'John Doe',
      bankName: 'State Bank of India',
      accountNumber: '1234567890123456',
      confirmAccountNumber: '1234567890123456',
      ifscCode: 'SBIN0001234',
      accountType: 'savings',
      branchName: 'Mumbai Main Branch',
      branchAddress: 'Mumbai, Maharashtra'
    },
    
    // Verification Status
    mobileVerified: false,
    
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
    // Step 1: Test mobile OTP sending
    console.log('📱 Step 1: Testing mobile OTP sending...');
    
    const otpResponse = await fetch('http://localhost:3000/api/v1/sellers/verify-mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: testData.mobile
      })
    });
    
    const otpResult = await otpResponse.json();
    console.log('OTP Response:', JSON.stringify(otpResult, null, 2));
    
    if (otpResponse.ok) {
      console.log('✅ Mobile OTP API is working correctly\n');
    } else {
      console.log('❌ Mobile OTP API failed\n');
      return;
    }

    // Step 2: Test mobile OTP verification (with dummy OTP)
    console.log('📱 Step 2: Testing mobile OTP verification...');
    
    const verifyResponse = await fetch('http://localhost:3000/api/v1/sellers/verify-mobile-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: testData.mobile,
        otp: '123456' // This will fail, but we can see the response
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log('OTP Verification Response:', JSON.stringify(verifyResult, null, 2));
    
    if (verifyResponse.ok) {
      console.log('✅ Mobile OTP verification API is working correctly\n');
    } else {
      console.log('⚠️  Mobile OTP verification failed (expected with dummy OTP)\n');
    }

    // Step 3: Test complete seller registration
    console.log('📝 Step 3: Testing complete seller registration...');
    
    const registrationResponse = await fetch('http://localhost:3000/api/v1/sellers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const registrationResult = await registrationResponse.json();
    console.log('Registration Response Status:', registrationResponse.status);
    console.log('Registration Response:', JSON.stringify(registrationResult, null, 2));
    
    if (registrationResponse.ok) {
      console.log('✅ Seller registration API is working correctly\n');
    } else {
      console.log('❌ Seller registration API failed\n');
    }

    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testSellerRegistrationFlow();