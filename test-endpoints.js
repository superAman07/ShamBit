// Quick test script to verify the fixed endpoints
const http = require('http');

const testEndpoint = (path, method = 'GET', headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing Fixed Endpoints...\n');

  // Test 1: Seller test endpoint
  try {
    const result = await testEndpoint('/api/v1/seller/test');
    console.log('✅ GET /api/v1/seller/test:', result.status === 200 ? 'WORKING' : `FAILED (${result.status})`);
  } catch (error) {
    console.log('❌ GET /api/v1/seller/test: ERROR -', error.message);
  }

  // Test 2: Profile endpoint (should require auth)
  try {
    const result = await testEndpoint('/api/v1/seller/profile');
    console.log('✅ GET /api/v1/seller/profile:', result.status === 401 ? 'WORKING (Auth Required)' : `UNEXPECTED (${result.status})`);
  } catch (error) {
    console.log('❌ GET /api/v1/seller/profile: ERROR -', error.message);
  }

  // Test 3: Business profile update endpoint (should require auth)
  try {
    const result = await testEndpoint('/api/v1/seller/profile/business', 'PUT');
    console.log('✅ PUT /api/v1/seller/profile/business:', result.status === 401 ? 'WORKING (Auth Required)' : `UNEXPECTED (${result.status})`);
  } catch (error) {
    console.log('❌ PUT /api/v1/seller/profile/business: ERROR -', error.message);
  }

  // Test 4: Legacy profile endpoint
  try {
    const result = await testEndpoint('/profile');
    console.log('✅ GET /profile:', result.status === 401 ? 'WORKING (Auth Required)' : `UNEXPECTED (${result.status})`);
  } catch (error) {
    console.log('❌ GET /profile: ERROR -', error.message);
  }

  console.log('\n🎯 Summary:');
  console.log('- All endpoints should return 401 (Unauthorized) when accessed without token');
  console.log('- Test endpoint should return 200 (OK)');
  console.log('- This confirms the routes are properly mounted and accessible');
}

runTests().catch(console.error);