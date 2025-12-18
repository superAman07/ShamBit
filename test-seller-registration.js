// Comprehensive test script for seller registration workflow
const fetch = require('node-fetch');

const comprehensiveSellerData = {
  // Part A: Personal Details
  fullName: "Priya Sharma",
  dateOfBirth: "1985-06-15",
  gender: "female",
  mobile: "9876543288",
  email: "priya.test2@greengrocers.com",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  
  // Part B: Business Information
  sellerType: "business",
  businessType: "proprietorship",
  businessName: "Green Grocers Delhi",
  natureOfBusiness: "Fresh fruits and vegetables wholesale and retail business",
  primaryBusinessActivity: "Grocery and fresh produce sales",
  yearOfEstablishment: 2018,
  businessPhone: "9876543298",
  businessEmail: "business@greengrocers.com",
  
  // Part C: Address Information
  registeredBusinessAddress: {
    addressLine1: "Shop No. 15, Green Market Complex",
    addressLine2: "Sector 18, Noida",
    city: "Noida",
    state: "Uttar Pradesh",
    pinCode: "201301"
  },
  warehouseAddresses: [
    {
      isPrimary: true,
      sameAsRegistered: false,
      addressLine1: "Warehouse A, Industrial Area Phase 1",
      addressLine2: "Near Metro Station",
      city: "Noida",
      state: "Uttar Pradesh",
      pinCode: "201301",
      contactPerson: "Raj Kumar",
      contactPhone: "9876543297",
      operatingHours: "6:00 AM - 10:00 PM",
      maxDeliveryRadius: 15
    }
  ],
  
  // Part D: Tax & Compliance Details
  gstRegistered: true,
  gstNumber: "09ABCDE1234F1Z5",
  gstin: "09ABCDE1234F1Z5",
  panNumber: "ABCDE1234F",
  panHolderName: "Priya Sharma",
  tdsApplicable: false,
  aadhaarNumber: "123456789012",
  
  // Part E: Bank Account Details
  bankDetails: {
    accountHolderName: "Priya Sharma",
    bankName: "State Bank of India",
    accountNumber: "1234567890123456",
    confirmAccountNumber: "1234567890123456",
    ifscCode: "SBIN0001234",
    accountType: "current",
    branchName: "Noida Sector 18",
    branchAddress: "Sector 18, Noida, UP - 201301"
  },
  
  // Operational Information
  primaryProductCategories: "Fresh fruits, vegetables, dairy products, packaged foods, beverages",
  estimatedMonthlyOrderVolume: "201-500",
  preferredPickupTimeSlots: "6:00 AM - 8:00 AM, 6:00 PM - 8:00 PM",
  maxOrderProcessingTime: 2,
  
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

const documentTestData = [
  {
    documentType: "panCard",
    documentUrl: "https://example.com/documents/pan_card.jpg",
    fileName: "pan_card.jpg",
    fileSize: 245760,
    mimeType: "image/jpeg"
  },
  {
    documentType: "aadhaarCard",
    documentUrl: "https://example.com/documents/aadhaar_card.jpg",
    fileName: "aadhaar_card.jpg",
    fileSize: 189440,
    mimeType: "image/jpeg"
  },
  {
    documentType: "businessCertificate",
    documentUrl: "https://example.com/documents/business_certificate.pdf",
    fileName: "business_certificate.pdf",
    fileSize: 512000,
    mimeType: "application/pdf"
  },
  {
    documentType: "gstCertificate",
    documentUrl: "https://example.com/documents/gst_certificate.pdf",
    fileName: "gst_certificate.pdf",
    fileSize: 387200,
    mimeType: "application/pdf"
  },
  {
    documentType: "addressProof",
    documentUrl: "https://example.com/documents/address_proof.jpg",
    fileName: "address_proof.jpg",
    fileSize: 298240,
    mimeType: "image/jpeg"
  },
  {
    documentType: "photograph",
    documentUrl: "https://example.com/documents/photograph.jpg",
    fileName: "photograph.jpg",
    fileSize: 156800,
    mimeType: "image/jpeg"
  },
  {
    documentType: "cancelledCheque",
    documentUrl: "https://example.com/documents/cancelled_cheque.jpg",
    fileName: "cancelled_cheque.jpg",
    fileSize: 234560,
    mimeType: "image/jpeg"
  }
];

async function testComprehensiveSellerWorkflow() {
  let sellerId = null;
  
  try {
    console.log('🚀 Starting comprehensive seller registration workflow test...\n');
    
    // Step 1: Register seller
    console.log('📝 Step 1: Registering seller with comprehensive data...');
    console.log('Seller data:', JSON.stringify(comprehensiveSellerData, null, 2));
    
    const registrationResponse = await fetch('http://localhost:3000/api/v1/sellers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comprehensiveSellerData)
    });

    const registrationResult = await registrationResponse.json();
    
    if (registrationResponse.ok) {
      console.log('✅ Seller registration successful!');
      console.log('Response:', JSON.stringify(registrationResult, null, 2));
      sellerId = registrationResult.data.sellerId;
    } else {
      console.log('❌ Seller registration failed!');
      console.log('Error:', JSON.stringify(registrationResult, null, 2));
      return;
    }
    
    // Step 2: Test mobile OTP verification
    console.log('\n📱 Step 2: Testing mobile OTP verification...');
    
    const mobileOtpResponse = await fetch('http://localhost:3000/api/v1/sellers/verify-mobile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobile: comprehensiveSellerData.mobile })
    });
    
    const mobileOtpResult = await mobileOtpResponse.json();
    console.log('Mobile OTP Response:', JSON.stringify(mobileOtpResult, null, 2));
    
    // Step 3: Test email OTP verification
    console.log('\n📧 Step 3: Testing email OTP verification...');
    
    const emailOtpResponse = await fetch('http://localhost:3000/api/v1/sellers/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: comprehensiveSellerData.email })
    });
    
    const emailOtpResult = await emailOtpResponse.json();
    console.log('Email OTP Response:', JSON.stringify(emailOtpResult, null, 2));
    
    // Step 4: Upload documents
    console.log('\n📄 Step 4: Uploading seller documents...');
    
    for (const document of documentTestData) {
      console.log(`Uploading ${document.documentType}...`);
      
      const documentResponse = await fetch(`http://localhost:3000/api/v1/sellers/${sellerId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document)
      });
      
      const documentResult = await documentResponse.json();
      
      if (documentResponse.ok) {
        console.log(`✅ ${document.documentType} uploaded successfully`);
      } else {
        console.log(`❌ ${document.documentType} upload failed:`, documentResult);
      }
    }
    
    // Step 5: Get seller documents status
    console.log('\n📋 Step 5: Checking document status...');
    
    const documentsResponse = await fetch(`http://localhost:3000/api/v1/sellers/${sellerId}/documents`);
    const documentsResult = await documentsResponse.json();
    
    if (documentsResponse.ok) {
      console.log('✅ Documents status retrieved successfully');
      console.log('Documents:', JSON.stringify(documentsResult.data, null, 2));
    } else {
      console.log('❌ Failed to get documents status:', documentsResult);
    }
    
    // Step 6: Get seller details
    console.log('\n👤 Step 6: Getting seller details...');
    
    const sellerResponse = await fetch(`http://localhost:3000/api/v1/sellers/${sellerId}`);
    const sellerResult = await sellerResponse.json();
    
    if (sellerResponse.ok) {
      console.log('✅ Seller details retrieved successfully');
      console.log('Seller:', JSON.stringify(sellerResult.data, null, 2));
    } else {
      console.log('❌ Failed to get seller details:', sellerResult);
    }
    
    console.log('\n🎉 Comprehensive seller registration workflow test completed!');
    console.log(`📊 Seller ID: ${sellerId}`);
    console.log('📝 Next steps for admin:');
    console.log('   1. Verify uploaded documents');
    console.log('   2. Approve/reject seller registration');
    console.log('   3. Generate and send login credentials');
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the comprehensive test
testComprehensiveSellerWorkflow();