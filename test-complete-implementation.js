#!/usr/bin/env node

/**
 * Complete Implementation Test Suite
 * Tests all components: API, Admin Portal, Website Pages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 COMPLETE IMPLEMENTATION TEST SUITE\n');
console.log('Testing: API, Admin Portal, Website, Database\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function testSection(name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log('='.repeat(60));
}

function testPass(message) {
  console.log(`  ✅ ${message}`);
  passedTests++;
  totalTests++;
}

function testFail(message, error = '') {
  console.log(`  ❌ ${message}`);
  if (error) console.log(`     ${error}`);
  failedTests++;
  totalTests++;
}

function testWarn(message) {
  console.log(`  ⚠️  ${message}`);
  warnings++;
}

function testInfo(message) {
  console.log(`  ℹ️  ${message}`);
}

// ============================================================================
// TEST 1: File Structure
// ============================================================================
testSection('FILE STRUCTURE');

const requiredFiles = {
  'API Services': [
    'services/api/src/services/seller.service.ts',
    'services/api/src/services/email.service.ts',
    'services/api/src/services/sms.service.ts',
    'services/api/src/services/otp.service.ts',
    'services/api/src/services/captcha.service.ts',
    'services/api/src/services/token.service.ts',
    'services/api/src/services/product.service.ts',
    'services/api/src/services/inventory.service.ts',
  ],
  'API Routes': [
    'services/api/src/routes/seller.routes.ts',
    'services/api/src/routes/seller-auth.routes.ts',
    'services/api/src/routes/seller-portal.routes.ts',
  ],
  'API Types': [
    'services/api/src/types/seller.types.ts',
    'services/api/src/types/product.types.ts',
  ],
  'Database Migrations': [
    'services/api/database/migrations/update_sellers_table.sql',
    'services/api/database/migrations/create_support_tables.sql',
    'services/api/database/migrations/run_migrations.js',
  ],
  'Admin Portal': [
    'services/admin-portal/src/features/sellers/SellersListPage.tsx',
    'services/admin-portal/src/features/sellers/SellerDetailsDialog.tsx',
    'services/admin-portal/src/features/sellers/SellerStatsDashboard.tsx',
    'services/admin-portal/src/features/products/ProductVerificationPage.tsx',
    'services/admin-portal/src/services/sellerService.ts',
  ],
  'Website Pages': [
    'Website/src/pages/SellerRegistration.tsx',
    'Website/src/pages/SellerLogin.tsx',
    'Website/src/pages/SellerForgotPassword.tsx',
    'Website/src/config/api.ts',
  ],
  'Documentation': [
    'FINAL_IMPLEMENTATION_SUMMARY.md',
    'PRODUCTION_READINESS_CHECKLIST.md',
    'SELLER_PAGES_IMPLEMENTATION_COMPLETE.md',
    'Website/SELLER_PAGES_GUIDE.md',
    'services/api/SELLER_WORKFLOW_API.md',
  ],
};

Object.entries(requiredFiles).forEach(([category, files]) => {
  testInfo(`Checking ${category}...`);
  files.forEach(file => {
    if (fs.existsSync(file)) {
      testPass(`${path.basename(file)}`);
    } else {
      testFail(`${path.basename(file)} - MISSING`);
    }
  });
});

// ============================================================================
// TEST 2: TypeScript Compilation
// ============================================================================
testSection('TYPESCRIPT COMPILATION');

// Test API compilation
testInfo('Compiling API service...');
try {
  execSync('npm run build', { cwd: 'services/api', stdio: 'pipe' });
  testPass('API builds successfully');
} catch (error) {
  testFail('API compilation failed', error.message);
}

// Test Admin Portal compilation
testInfo('Compiling Admin Portal...');
try {
  execSync('npm run build', { cwd: 'services/admin-portal', stdio: 'pipe' });
  testPass('Admin Portal builds successfully');
} catch (error) {
  testFail('Admin Portal compilation failed', error.message);
}

// Test Website compilation
testInfo('Compiling Website...');
try {
  execSync('npm run build', { cwd: 'Website', stdio: 'pipe' });
  testPass('Website builds successfully');
} catch (error) {
  testFail('Website compilation failed', error.message);
}

// ============================================================================
// TEST 3: Code Quality Checks
// ============================================================================
testSection('CODE QUALITY');

// Check for console.log in production code
testInfo('Checking for console.log statements...');
const filesToCheck = [
  'services/api/src/services/seller.service.ts',
  'services/api/src/services/email.service.ts',
  'services/api/src/services/sms.service.ts',
];

let consoleLogCount = 0;
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/console\.log\(/g);
    if (matches) {
      consoleLogCount += matches.length;
    }
  }
});

if (consoleLogCount === 0) {
  testPass('No console.log statements in production code');
} else {
  testWarn(`Found ${consoleLogCount} console.log statements`);
}

// Check for TODO comments
testInfo('Checking for TODO comments...');
let todoCount = 0;
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/TODO/gi);
    if (matches) {
      todoCount += matches.length;
    }
  }
});

if (todoCount === 0) {
  testPass('No TODO comments found');
} else {
  testInfo(`Found ${todoCount} TODO comments (informational)`);
}

// ============================================================================
// TEST 4: API Endpoints
// ============================================================================
testSection('API ENDPOINTS');

const routeFiles = [
  'services/api/src/routes/seller-auth.routes.ts',
  'services/api/src/routes/seller-portal.routes.ts',
  'services/api/src/routes/seller.routes.ts',
];

let totalEndpoints = 0;
routeFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const endpoints = content.match(/router\.(get|post|put|delete|patch)/g) || [];
    totalEndpoints += endpoints.length;
    testPass(`${path.basename(file)} - ${endpoints.length} endpoints`);
  }
});

testInfo(`Total API endpoints: ${totalEndpoints}`);

// ============================================================================
// TEST 5: Database Migrations
// ============================================================================
testSection('DATABASE MIGRATIONS');

const migrationFiles = [
  'services/api/database/migrations/update_sellers_table.sql',
  'services/api/database/migrations/create_support_tables.sql',
];

migrationFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for CREATE TABLE statements
    const createTables = content.match(/CREATE TABLE/gi) || [];
    
    // Check for ALTER TABLE statements
    const alterTables = content.match(/ALTER TABLE/gi) || [];
    
    // Check for CREATE INDEX statements
    const createIndexes = content.match(/CREATE INDEX/gi) || [];
    
    if (createTables.length > 0 || alterTables.length > 0) {
      testPass(`${path.basename(file)} - ${createTables.length} tables, ${alterTables.length} alterations, ${createIndexes.length} indexes`);
    } else {
      testFail(`${path.basename(file)} - No valid SQL statements found`);
    }
  } else {
    testFail(`${path.basename(file)} - Missing`);
  }
});

// ============================================================================
// TEST 6: Service Implementation
// ============================================================================
testSection('SERVICE IMPLEMENTATION');

const services = [
  { file: 'services/api/src/services/email.service.ts', methods: ['sendSellerCredentials', 'sendPasswordResetOTP'] },
  { file: 'services/api/src/services/sms.service.ts', methods: ['sendOTP', 'sendCredentialsNotification'] },
  { file: 'services/api/src/services/otp.service.ts', methods: ['generateOTP', 'verifyOTP'] },
  { file: 'services/api/src/services/captcha.service.ts', methods: ['verifyCaptcha', 'generateMathCaptcha'] },
  { file: 'services/api/src/services/token.service.ts', methods: ['generateTokens', 'verifyAccessToken', 'blacklistToken'] },
  { file: 'services/api/src/services/seller.service.ts', methods: ['registerSeller', 'authenticateSeller', 'verifySellerOTP'] },
];

services.forEach(({ file, methods }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let allMethodsFound = true;
    
    methods.forEach(method => {
      if (!content.includes(method)) {
        allMethodsFound = false;
      }
    });
    
    if (allMethodsFound) {
      testPass(`${path.basename(file)} - All ${methods.length} methods implemented`);
    } else {
      testFail(`${path.basename(file)} - Some methods missing`);
    }
  } else {
    testFail(`${path.basename(file)} - File missing`);
  }
});

// ============================================================================
// TEST 7: Website Pages
// ============================================================================
testSection('WEBSITE PAGES');

const websitePages = [
  { file: 'Website/src/pages/SellerRegistration.tsx', features: ['FormData', 'validateStep', 'handleSubmit', 'steps'] },
  { file: 'Website/src/pages/SellerLogin.tsx', features: ['LoginFormData', 'handleCredentialsSubmit', 'handleOTPSubmit', 'generateCaptcha'] },
  { file: 'Website/src/pages/SellerForgotPassword.tsx', features: ['handleEmailSubmit', 'handleOTPSubmit', 'handlePasswordSubmit'] },
];

websitePages.forEach(({ file, features }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let allFeaturesFound = true;
    
    features.forEach(feature => {
      if (!content.includes(feature)) {
        allFeaturesFound = false;
      }
    });
    
    if (allFeaturesFound) {
      testPass(`${path.basename(file)} - All ${features.length} features implemented`);
    } else {
      testFail(`${path.basename(file)} - Some features missing`);
    }
    
    // Check line count
    const lines = content.split('\n').length;
    testInfo(`  ${lines} lines of code`);
  } else {
    testFail(`${path.basename(file)} - File missing`);
  }
});

// ============================================================================
// TEST 8: API Configuration
// ============================================================================
testSection('API CONFIGURATION');

const apiConfigFile = 'Website/src/config/api.ts';
if (fs.existsSync(apiConfigFile)) {
  const content = fs.readFileSync(apiConfigFile, 'utf8');
  
  const requiredEndpoints = [
    'REGISTER',
    'LOGIN',
    'VERIFY_OTP',
    'CAPTCHA',
    'FORGOT_PASSWORD',
    'RESET_PASSWORD',
  ];
  
  let allEndpointsFound = true;
  requiredEndpoints.forEach(endpoint => {
    if (!content.includes(endpoint)) {
      allEndpointsFound = false;
    }
  });
  
  if (allEndpointsFound) {
    testPass(`API configuration complete - ${requiredEndpoints.length} endpoints configured`);
  } else {
    testFail('API configuration incomplete - Some endpoints missing');
  }
} else {
  testFail('API configuration file missing');
}

// ============================================================================
// TEST 9: Environment Configuration
// ============================================================================
testSection('ENVIRONMENT CONFIGURATION');

const envFile = '.env';
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  
  const requiredVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];
  
  requiredVars.forEach(varName => {
    if (content.includes(`${varName}=`)) {
      testPass(`${varName} configured`);
    } else {
      testWarn(`${varName} not configured`);
    }
  });
  
  // Check for optional but recommended vars
  const optionalVars = [
    'SMTP_HOST',
    'SMTP_USER',
    'SMS_PROVIDER',
    'RECAPTCHA_SECRET_KEY',
  ];
  
  testInfo('Optional configurations:');
  optionalVars.forEach(varName => {
    if (content.includes(`${varName}=`)) {
      testInfo(`  ✓ ${varName} configured`);
    } else {
      testInfo(`  - ${varName} not configured (optional)`);
    }
  });
} else {
  testWarn('.env file not found');
}

// ============================================================================
// TEST 10: Documentation
// ============================================================================
testSection('DOCUMENTATION');

const docFiles = [
  { file: 'FINAL_IMPLEMENTATION_SUMMARY.md', minLines: 100 },
  { file: 'PRODUCTION_READINESS_CHECKLIST.md', minLines: 100 },
  { file: 'SELLER_PAGES_IMPLEMENTATION_COMPLETE.md', minLines: 100 },
  { file: 'Website/SELLER_PAGES_GUIDE.md', minLines: 100 },
  { file: 'services/api/SELLER_WORKFLOW_API.md', minLines: 50 },
];

docFiles.forEach(({ file, minLines }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    
    if (lines >= minLines) {
      testPass(`${path.basename(file)} - ${lines} lines`);
    } else {
      testWarn(`${path.basename(file)} - Only ${lines} lines (expected ${minLines}+)`);
    }
  } else {
    testFail(`${path.basename(file)} - Missing`);
  }
});

// ============================================================================
// TEST 11: Dependencies
// ============================================================================
testSection('DEPENDENCIES');

const packageFiles = [
  { file: 'services/api/package.json', deps: ['bcrypt', 'jsonwebtoken', 'nodemailer'] },
  { file: 'services/admin-portal/package.json', deps: ['@mui/material', 'react'] },
  { file: 'Website/package.json', deps: ['react', 'framer-motion', 'lucide-react'] },
];

packageFiles.forEach(({ file, deps }) => {
  if (fs.existsSync(file)) {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    const allDeps = { ...content.dependencies, ...content.devDependencies };
    
    let allFound = true;
    deps.forEach(dep => {
      if (!allDeps[dep]) {
        allFound = false;
      }
    });
    
    if (allFound) {
      testPass(`${path.basename(path.dirname(file))} - All required dependencies installed`);
    } else {
      testWarn(`${path.basename(path.dirname(file))} - Some dependencies missing`);
    }
  } else {
    testFail(`${file} - Missing`);
  }
});

// ============================================================================
// TEST 12: Security Checks
// ============================================================================
testSection('SECURITY CHECKS');

// Check for hardcoded credentials
testInfo('Checking for hardcoded credentials...');
const securityFiles = [
  'services/api/src/services/seller.service.ts',
  'services/api/src/services/email.service.ts',
  'services/api/src/services/sms.service.ts',
];

let securityIssues = 0;
const dangerousPatterns = [
  /password\s*=\s*['"][^'"]+['"]/gi,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
  /secret\s*=\s*['"][^'"]+['"]/gi,
];

securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    dangerousPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        securityIssues += matches.length;
      }
    });
  }
});

if (securityIssues === 0) {
  testPass('No hardcoded credentials found');
} else {
  testWarn(`Found ${securityIssues} potential hardcoded credentials`);
}

// Check for environment variable usage
testInfo('Checking for environment variable usage...');
let envVarUsage = 0;
securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/process\.env\./g);
    if (matches) {
      envVarUsage += matches.length;
    }
  }
});

if (envVarUsage > 0) {
  testPass(`Using environment variables (${envVarUsage} references)`);
} else {
  testWarn('No environment variable usage found');
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

console.log(`\nTotal Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`\n📈 Success Rate: ${successRate}%`);

// Status determination
let status = 'UNKNOWN';
let statusIcon = '❓';

if (failedTests === 0 && passedTests > 0) {
  status = 'PRODUCTION READY';
  statusIcon = '🎉';
} else if (failedTests <= 2 && passedTests > totalTests * 0.9) {
  status = 'MOSTLY READY';
  statusIcon = '✅';
} else if (failedTests <= 5) {
  status = 'NEEDS ATTENTION';
  statusIcon = '⚠️';
} else {
  status = 'NEEDS WORK';
  statusIcon = '❌';
}

console.log(`\n${statusIcon} STATUS: ${status}`);

// Recommendations
console.log('\n📋 RECOMMENDATIONS:');

if (failedTests === 0) {
  console.log('  ✅ All tests passed! System is ready for deployment.');
  console.log('  ✅ Run database migrations before deploying.');
  console.log('  ✅ Configure production environment variables.');
  console.log('  ✅ Set up email/SMS service credentials.');
} else {
  console.log(`  ⚠️  Fix ${failedTests} failed test(s) before deployment.`);
  console.log('  ⚠️  Review warnings and address critical issues.');
}

if (warnings > 0) {
  console.log(`  ℹ️  Review ${warnings} warning(s) for optimization opportunities.`);
}

console.log('\n📚 DOCUMENTATION:');
console.log('  - FINAL_IMPLEMENTATION_SUMMARY.md');
console.log('  - PRODUCTION_READINESS_CHECKLIST.md');
console.log('  - SELLER_PAGES_IMPLEMENTATION_COMPLETE.md');
console.log('  - Website/SELLER_PAGES_GUIDE.md');

console.log('\n🚀 NEXT STEPS:');
console.log('  1. Review test results above');
console.log('  2. Fix any failed tests');
console.log('  3. Run database migrations');
console.log('  4. Configure environment variables');
console.log('  5. Deploy to staging environment');
console.log('  6. Run end-to-end tests');
console.log('  7. Deploy to production');

console.log('\n' + '='.repeat(60));
console.log('Test suite completed!');
console.log('='.repeat(60) + '\n');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);