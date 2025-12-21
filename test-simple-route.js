const axios = require('axios');

async function testRoutes() {
  console.log('Testing available routes...\n');

  const routes = [
    'http://localhost:3000/health',
    'http://localhost:3000/api',
    'http://localhost:3000/api/v1',
    'http://localhost:3000/api/v1/seller-registration',
    'http://localhost:3000/api/v1/seller-registration/login'
  ];

  for (const route of routes) {
    try {
      console.log(`Testing: ${route}`);
      const response = await axios.get(route);
      console.log(`✅ ${route} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${route} - Status: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

testRoutes().catch(console.error);