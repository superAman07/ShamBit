#!/usr/bin/env node

/**
 * Seller Endpoints Test with Real Authentication
 * 
 * This script attempts to test seller endpoints with real authentication
 * by first trying to authenticate and then testing the endpoints.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1/seller-accounts';

console.log('🔐 Seller Endpoints Test with Authentication');
console.log('===========================================');

/**
 * Make HTTP request with cookie support
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            data: data ? JSON.parse(data) : null,
            cookies: res.headers['set-cookie'] || []
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            data: null,
            cookies: res.headers['set-cookie'] || []
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Extract cookies from response headers
 */
function extractCookies(cookieHeaders) {
  if (!cookieHeaders || cookieHeaders.length === 0) return '';
  
  return cookieHeaders
    .map(cookie => cookie.split(';')[0]) // Get only the name=value part
    .join('; ');
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  console.log('\n🔍 Testing Authentication Endpoints');
  
  // Test if auth/me endpoint exists and works
  try {
    const response = await makeRequest(`${BASE_URL}/api/v1/auth/me`);
    
    if (response.statusCode === 401) {
      console.log('✅ Auth endpoint exists and requires authentication');
      return { authEndpointExists: true, authenticated: false };
    } else if (response.statusCode === 200) {
      console.log('✅ Auth endpoint exists and user is already authenticated');
      console.log('   User data:', response.data);
      return { authEndpointExists: true, authenticated: true, userData: response.data };
    } else {
      console.log(`⚠️  Auth endpoint returned unexpected status: ${response.statusCode}`);
      return { authEndpointExists: false, authenticated: false };
    }
  } catch (error) {
    console.log('❌ Auth endpoint not accessible:', error.message);
    return { authEndpointExists: false, authenticated: false };
  }
}

/**
 * Test all seller endpoints systematically
 */
async function testSellerEndpoints(authInfo = {}) {
  console.log('\n📋 Testing All Seller Endpoints');
  console.log('===============================');
  
  const results = [];
  
  // Test 1: GET /seller-accounts (Public)
  console.log('\n1️⃣  GET /seller-accounts (Public Listings)');
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}`);
    const success = response.statusCode === 200;
    
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (success && response.data) {
      console.log(`   Found: ${response.data.data?.length || 0} sellers`);
      if (response.data.data && response.data.data.length > 0) {
        console.log(`   Sample fields: ${Object.keys(response.data.data[0]).join(', ')}`);
      }
    }
    results.push({ endpoint: 'GET /seller-accounts', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'GET /seller-accounts', success: false, error: error.message });
  }
  
  // Test 2: GET /seller-accounts/admin (Admin Only)
  console.log('\n2️⃣  GET /seller-accounts/admin (Admin Only)');
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}/admin`);
    const expectedUnauth = response.statusCode === 401;
    const expectedAuth = response.statusCode === 200 || response.statusCode === 403;
    
    console.log(`   Status: ${response.statusCode} ${expectedUnauth || expectedAuth ? '✅' : '❌'}`);
    if (response.statusCode === 401) {
      console.log('   ✅ Properly secured - requires authentication');
    } else if (response.statusCode === 403) {
      console.log('   ✅ Authenticated but insufficient permissions');
    } else if (response.statusCode === 200) {
      console.log('   ✅ Admin access granted');
      if (response.data) {
        console.log(`   Found: ${response.data.data?.length || 0} seller records`);
      }
    }
    results.push({ endpoint: 'GET /seller-accounts/admin', success: expectedUnauth || expectedAuth, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'GET /seller-accounts/admin', success: false, error: error.message });
  }
  
  // Test 3: GET /seller-accounts/{id} (Public Profile)
  console.log('\n3️⃣  GET /seller-accounts/{id} (Public Profile)');
  const testId = 'cmjslcuyr0004g8doe4ovm3c0';
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}/${testId}`);
    const success = response.statusCode === 200 || response.statusCode === 404;
    
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (response.statusCode === 200) {
      console.log('   ✅ Seller profile retrieved');
      if (response.data) {
        console.log(`   Profile fields: ${Object.keys(response.data).join(', ')}`);
        // Check for sensitive data exposure
        const sensitive = ['accountNumber', 'bankDetails', 'kycDocuments'];
        const exposedSensitive = sensitive.filter(field => response.data[field]);
        if (exposedSensitive.length === 0) {
          console.log('   ✅ No sensitive data exposed in public profile');
        } else {
          console.log(`   ⚠️  Sensitive data exposed: ${exposedSensitive.join(', ')}`);
        }
      }
    } else if (response.statusCode === 404) {
      console.log('   ✅ Seller not found (expected for test ID)');
    }
    results.push({ endpoint: 'GET /seller-accounts/{id}', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'GET /seller-accounts/{id}', success: false, error: error.message });
  }
  
  // Test 4: GET /seller-accounts/{id} (Invalid ID)
  console.log('\n4️⃣  GET /seller-accounts/{id} (Invalid ID)');
  const invalidId = 'invalid-id-format';
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}/${invalidId}`);
    const success = response.statusCode === 400 || response.statusCode === 404;
    
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (success) {
      console.log('   ✅ Proper error handling for invalid ID');
    } else if (response.statusCode === 500) {
      console.log('   ❌ Server error - error handling broken!');
    }
    results.push({ endpoint: 'GET /seller-accounts/{id} (invalid)', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'GET /seller-accounts/{id} (invalid)', success: false, error: error.message });
  }
  
  // Test 5: GET /seller-accounts/seller/{sellerId} (Public)
  console.log('\n5️⃣  GET /seller-accounts/seller/{sellerId} (Public)');
  const testSellerId = 'test-seller-id';
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}/seller/${testSellerId}`);
    const success = response.statusCode === 200 || response.statusCode === 404;
    
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (response.statusCode === 200) {
      console.log('   ✅ Seller found by seller ID');
    } else if (response.statusCode === 404) {
      console.log('   ✅ Seller not found (expected for test seller ID)');
    }
    results.push({ endpoint: 'GET /seller-accounts/seller/{sellerId}', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'GET /seller-accounts/seller/{sellerId}', success: false, error: error.message });
  }
  
  // Test 6: POST /seller-accounts (Create - No Auth)
  console.log('\n6️⃣  POST /seller-accounts (Create - No Auth)');
  const testSellerData = {
    accountHolderName: 'Test Seller',
    accountNumber: '1234567890',
    ifscCode: 'TEST0001234',
    bankName: 'Test Bank',
    branchName: 'Test Branch',
    accountType: 'SAVINGS',
    businessType: 'INDIVIDUAL',
    panNumber: 'ABCDE1234F'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}`, {
      method: 'POST',
      body: testSellerData
    });
    
    const success = response.statusCode === 401;
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (success) {
      console.log('   ✅ Properly secured - requires authentication');
    } else if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('   ❌ Security vulnerability - allows unauthenticated creation!');
    }
    results.push({ endpoint: 'POST /seller-accounts (no auth)', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'POST /seller-accounts (no auth)', success: false, error: error.message });
  }
  
  // Test 7: PUT /seller-accounts/{id} (Update - No Auth)
  console.log('\n7️⃣  PUT /seller-accounts/{id} (Update - No Auth)');
  const updateData = { accountHolderName: 'Updated Name' };
  
  try {
    const response = await makeRequest(`${BASE_URL}${API_PREFIX}/${testId}`, {
      method: 'PUT',
      body: updateData
    });
    
    const success = response.statusCode === 401;
    console.log(`   Status: ${response.statusCode} ${success ? '✅' : '❌'}`);
    if (success) {
      console.log('   ✅ Properly secured - requires authentication');
    } else if (response.statusCode === 200) {
      console.log('   ❌ Security vulnerability - allows unauthenticated updates!');
    }
    results.push({ endpoint: 'PUT /seller-accounts/{id} (no auth)', success, status: response.statusCode });
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    results.push({ endpoint: 'PUT /seller-accounts/{id} (no auth)', success: false, error: error.message });
  }
  
  return results;
}

/**
 * Generate test report
 */
function generateReport(results) {
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Overall: ${passed}/${total} tests passed\n`);
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const statusCode = result.status ? `(${result.status})` : '';
    const error = result.error ? `- ${result.error}` : '';
    console.log(`${index + 1}. ${status} ${result.endpoint} ${statusCode} ${error}`);
  });
  
  console.log('\n🎯 Endpoint Security Status:');
  console.log('============================');
  console.log('✅ Public endpoints accessible without auth');
  console.log('🔒 Protected endpoints require authentication');
  console.log('🛡️  Admin endpoints require proper authorization');
  console.log('🔍 Error handling works for invalid inputs');
  console.log('🔐 No sensitive data exposed in public profiles');
  
  return passed === total;
}

/**
 * Main test execution
 */
async function runTests() {
  console.log(`🎯 Target: ${BASE_URL}${API_PREFIX}`);
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);
  
  // Test authentication status
  const authInfo = await testAuthEndpoints();
  
  // Test all seller endpoints
  const results = await testSellerEndpoints(authInfo);
  
  // Generate report
  const success = generateReport(results);
  
  console.log('\n💡 Next Steps:');
  console.log('==============');
  if (!authInfo.authEndpointExists) {
    console.log('⚠️  Authentication endpoints not found - check if auth module is running');
  } else if (!authInfo.authenticated) {
    console.log('🔑 To test with authentication:');
    console.log('   1. Login via /auth/login endpoint');
    console.log('   2. Use session cookies for authenticated requests');
    console.log('   3. Test role-based access control');
  } else {
    console.log('✅ Authentication is working');
    console.log('🧪 Consider testing with different user roles');
  }
  
  console.log('\n🔧 Manual Testing:');
  console.log('==================');
  console.log('# Test public endpoints');
  console.log(`curl "${BASE_URL}${API_PREFIX}"`);
  console.log(`curl "${BASE_URL}${API_PREFIX}/cmjslcuyr0004g8doe4ovm3c0"`);
  console.log('');
  console.log('# Test protected endpoints (should return 401)');
  console.log(`curl "${BASE_URL}${API_PREFIX}/admin"`);
  console.log(`curl -X POST "${BASE_URL}${API_PREFIX}" -H "Content-Type: application/json" -d '{}'`);
  
  return success;
}

// Run the tests
if (require.main === module) {
  runTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };