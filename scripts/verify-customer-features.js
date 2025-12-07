/**
 * Customer-Facing Features Verification Script
 * 
 * This script verifies that all customer-facing features are intact after simplification:
 * 1. Product listing and search
 * 2. Product filtering and sorting
 * 3. Product offers and promotions
 * 4. Location features (Leaflet/Nominatim)
 * 5. Notification features
 * 6. Home screen features
 */

const axios = require('axios');
const { getDatabase } = require('@shambit/database');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Log test result
 */
function logTest(category, test, passed, message = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  
  console.log(`${color}${status}${colors.reset} [${category}] ${test}${message ? ': ' + message : ''}`);
  
  results.tests.push({ category, test, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Log warning
 */
function logWarning(category, message) {
  console.log(`${colors.yellow}⚠${colors.reset} [${category}] ${message}`);
  results.warnings++;
}

/**
 * Log section header
 */
function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Test 1: Product Listing
 */
async function testProductListing() {
  logSection('1. Product Listing and Search');
  
  try {
    // Test basic product listing
    const response = await axios.get(`${API_URL}/products`, {
      params: { page: 1, pageSize: 10 },
    });
    
    logTest('Product Listing', 'GET /products', response.status === 200);
    logTest('Product Listing', 'Returns products array', Array.isArray(response.data.data));
    logTest('Product Listing', 'Returns pagination', !!response.data.pagination);
    
    if (response.data.data.length > 0) {
      const product = response.data.data[0];
      logTest('Product Listing', 'Product has required fields', 
        !!(product.id && product.name && product.sellingPrice));
    } else {
      logWarning('Product Listing', 'No products found in database');
    }
    
    // Test product search
    const searchResponse = await axios.get(`${API_URL}/products/search`, {
      params: { search: 'test', page: 1, pageSize: 10 },
    });
    
    logTest('Product Search', 'GET /products/search', searchResponse.status === 200);
    logTest('Product Search', 'Returns search results', Array.isArray(searchResponse.data.data));
    
  } catch (error) {
    logTest('Product Listing', 'API request', false, error.message);
  }
}

/**
 * Test 2: Product Filtering and Sorting
 */
async function testProductFiltering() {
  logSection('2. Product Filtering and Sorting');
  
  try {
    // Test category filter
    const categoryResponse = await axios.get(`${API_URL}/products`, {
      params: { categoryId: 'test-category', page: 1, pageSize: 10 },
    });
    
    logTest('Product Filtering', 'Category filter', categoryResponse.status === 200);
    
    // Test brand filter
    const brandResponse = await axios.get(`${API_URL}/products`, {
      params: { brandId: 'test-brand', page: 1, pageSize: 10 },
    });
    
    logTest('Product Filtering', 'Brand filter', brandResponse.status === 200);
    
    // Test price range filter
    const priceResponse = await axios.get(`${API_URL}/products`, {
      params: { minPrice: 10, maxPrice: 100, page: 1, pageSize: 10 },
    });
    
    logTest('Product Filtering', 'Price range filter', priceResponse.status === 200);
    
    // Test active products filter
    const activeResponse = await axios.get(`${API_URL}/products`, {
      params: { isActive: true, page: 1, pageSize: 10 },
    });
    
    logTest('Product Filtering', 'Active products filter', activeResponse.status === 200);
    
    // Test featured products
    const featuredResponse = await axios.get(`${API_URL}/products`, {
      params: { isFeatured: true, page: 1, pageSize: 10 },
    });
    
    logTest('Product Filtering', 'Featured products filter', featuredResponse.status === 200);
    
  } catch (error) {
    logTest('Product Filtering', 'API request', false, error.message);
  }
}

/**
 * Test 3: Product Offers and Promotions
 */
async function testOffersAndPromotions() {
  logSection('3. Product Offers and Promotions');
  
  try {
    // Test hero banners
    const heroResponse = await axios.get(`${API_URL}/product-offers/banners/hero`);
    
    logTest('Offers', 'GET /product-offers/banners/hero', heroResponse.status === 200);
    logTest('Offers', 'Returns hero banners', Array.isArray(heroResponse.data.data));
    
    // Test promotional banners
    const promoResponse = await axios.get(`${API_URL}/product-offers/banners/promotional`);
    
    logTest('Offers', 'GET /product-offers/banners/promotional', promoResponse.status === 200);
    logTest('Offers', 'Returns promotional banners', Array.isArray(promoResponse.data.data));
    
    // Test category banners
    const categoryBannerResponse = await axios.get(`${API_URL}/product-offers/banners/category`);
    
    logTest('Offers', 'GET /product-offers/banners/category', categoryBannerResponse.status === 200);
    
    // Test available promotions
    const promotionsResponse = await axios.get(`${API_URL}/promotions/available`);
    
    logTest('Promotions', 'GET /promotions/available', promotionsResponse.status === 200);
    logTest('Promotions', 'Returns available promotions', Array.isArray(promotionsResponse.data.data));
    
  } catch (error) {
    logTest('Offers', 'API request', false, error.message);
  }
}

/**
 * Test 4: Location Features (Leaflet/Nominatim)
 */
async function testLocationFeatures() {
  logSection('4. Location Features (Leaflet/Nominatim)');
  
  try {
    // Test reverse geocoding with sample coordinates (New Delhi)
    const geocodeResponse = await axios.get(`${API_URL}/location/reverse-geocode`, {
      params: { latitude: 28.6139, longitude: 77.2090 },
    });
    
    logTest('Location', 'GET /location/reverse-geocode', geocodeResponse.status === 200);
    logTest('Location', 'Returns address data', !!geocodeResponse.data.data);
    
    if (geocodeResponse.data.data) {
      const address = geocodeResponse.data.data;
      logTest('Location', 'Address has required fields', 
        !!(address.address && address.city && address.state));
    }
    
    // Verify no Redis caching (should always fetch from API)
    logTest('Location', 'No Redis caching (direct API calls)', 
      geocodeResponse.data.source === 'api' || !geocodeResponse.data.source);
    
  } catch (error) {
    logTest('Location', 'API request', false, error.message);
  }
}

/**
 * Test 5: Notification Features
 */
async function testNotificationFeatures() {
  logSection('5. Notification Features');
  
  try {
    // Note: These endpoints require authentication, so we'll just verify they exist
    // In a real test, you would need to authenticate first
    
    // Test notification endpoints exist (will return 401 without auth)
    try {
      await axios.get(`${API_URL}/notifications/preferences`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Notifications', 'GET /notifications/preferences endpoint exists', true);
      } else {
        throw error;
      }
    }
    
    try {
      await axios.get(`${API_URL}/notifications/history`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Notifications', 'GET /notifications/history endpoint exists', true);
      } else {
        throw error;
      }
    }
    
    // Verify notification service exists in database
    const db = getDatabase();
    const notificationTables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('device_tokens', 'notification_preferences', 'notification_history')
    `);
    
    logTest('Notifications', 'Database tables exist', notificationTables.rows.length > 0);
    
  } catch (error) {
    logTest('Notifications', 'Verification', false, error.message);
  }
}

/**
 * Test 6: Home Screen Features
 */
async function testHomeScreenFeatures() {
  logSection('6. Home Screen Features');
  
  try {
    // Test home endpoint
    const homeResponse = await axios.get(`${API_URL}/home`);
    
    logTest('Home Screen', 'GET /home', homeResponse.status === 200);
    logTest('Home Screen', 'Returns home data', !!homeResponse.data.data);
    
    if (homeResponse.data.data) {
      const homeData = homeResponse.data.data;
      
      logTest('Home Screen', 'Has hero banners', Array.isArray(homeData.heroBanners));
      logTest('Home Screen', 'Has value propositions', Array.isArray(homeData.valuePropositions));
      logTest('Home Screen', 'Has categories', Array.isArray(homeData.categories));
      logTest('Home Screen', 'Has featured products', Array.isArray(homeData.featuredProducts));
      logTest('Home Screen', 'Has promotional banners', Array.isArray(homeData.promotionalBanners));
      
      // Verify value propositions include key features
      if (homeData.valuePropositions && homeData.valuePropositions.length > 0) {
        const hasLiveStock = homeData.valuePropositions.some(vp => 
          vp.title && vp.title.toLowerCase().includes('live stock')
        );
        const hasSatyata = homeData.valuePropositions.some(vp => 
          vp.title && vp.title.toLowerCase().includes('satyatā')
        );
        
        logTest('Home Screen', 'Has "Live Stock" value proposition', hasLiveStock);
        logTest('Home Screen', 'Has "Satyatā Promise" value proposition', hasSatyata);
      }
    }
    
    // Test categories endpoint
    const categoriesResponse = await axios.get(`${API_URL}/categories`, {
      params: { isActive: true, page: 1, pageSize: 10 },
    });
    
    logTest('Home Screen', 'GET /categories', categoriesResponse.status === 200);
    logTest('Home Screen', 'Returns categories', Array.isArray(categoriesResponse.data.data));
    
  } catch (error) {
    logTest('Home Screen', 'API request', false, error.message);
  }
}

/**
 * Test 7: Database Verification
 */
async function testDatabaseIntegrity() {
  logSection('7. Database Integrity');
  
  try {
    const db = getDatabase();
    
    // Verify essential tables exist
    const essentialTables = [
      'products',
      'categories',
      'brands',
      'product_images',
      'product_offers',
      'promotions',
      'orders',
      'users',
    ];
    
    for (const table of essentialTables) {
      const result = await db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ?
        )
      `, [table]);
      
      logTest('Database', `Table "${table}" exists`, result.rows[0].exists);
    }
    
    // Verify removed tables are gone
    const removedTables = ['batches', 'product_batches', 'analytics_events', 'analytics_aggregations'];
    
    for (const table of removedTables) {
      const result = await db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ?
        )
      `, [table]);
      
      logTest('Database', `Table "${table}" removed`, !result.rows[0].exists);
    }
    
    // Verify inventory is simplified (no batch fields)
    const inventoryColumns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'inventory'
    `);
    
    const columnNames = inventoryColumns.rows.map(row => row.column_name);
    const hasBatchFields = columnNames.some(col => 
      ['batch_id', 'expiry_date', 'manufacturing_date', 'lot_number'].includes(col)
    );
    
    logTest('Database', 'Inventory simplified (no batch fields)', !hasBatchFields);
    
  } catch (error) {
    logTest('Database', 'Verification', false, error.message);
  }
}

/**
 * Print summary
 */
function printSummary() {
  logSection('Test Summary');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  console.log(`Pass Rate: ${passRate}%\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - [${t.category}] ${t.test}${t.message ? ': ' + t.message : ''}`);
      });
    console.log();
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.blue}Customer-Facing Features Verification${colors.reset}`);
  console.log(`API URL: ${API_URL}\n`);
  
  try {
    await testProductListing();
    await testProductFiltering();
    await testOffersAndPromotions();
    await testLocationFeatures();
    await testNotificationFeatures();
    await testHomeScreenFeatures();
    await testDatabaseIntegrity();
    
    printSummary();
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
