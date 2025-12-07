#!/usr/bin/env node

/**
 * Security audit script for production readiness
 * Run: node scripts/security-audit.js
 */

const fs = require('fs');
const path = require('path');

const CHECKS = {
  CRITICAL: [],
  WARNING: [],
  INFO: []
};

function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    CHECKS.CRITICAL.push('.env file not found - create from .env.example');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for default/weak secrets
  if (envContent.includes('your-super-secret') || 
      envContent.includes('change-this-in-production') ||
      envContent.includes('CHANGE-THIS')) {
    CHECKS.CRITICAL.push('Default secrets detected in .env - generate secure secrets');
  }
  
  // Check NODE_ENV
  if (!envContent.includes('NODE_ENV=production')) {
    CHECKS.WARNING.push('NODE_ENV is not set to production');
  }
  
  // Check SKIP_TEST_DATA
  if (!envContent.includes('SKIP_TEST_DATA=true')) {
    CHECKS.CRITICAL.push('SKIP_TEST_DATA must be true in production');
  }
  
  // Check CORS
  if (envContent.includes('CORS_ORIGIN=*')) {
    CHECKS.CRITICAL.push('CORS_ORIGIN is set to wildcard (*) - specify allowed domains');
  }
  
  // Check JWT secret length
  const jwtSecretMatch = envContent.match(/JWT_SECRET=(.+)/);
  if (jwtSecretMatch && jwtSecretMatch[1].length < 32) {
    CHECKS.CRITICAL.push('JWT_SECRET is too short (minimum 32 characters)');
  }
  
  // Check if Firebase is configured
  if (!envContent.includes('FIREBASE_PROJECT_ID=') || 
      envContent.includes('FIREBASE_PROJECT_ID=your-firebase-project-id')) {
    CHECKS.WARNING.push('Firebase not configured - push notifications will not work');
  }
  
  CHECKS.INFO.push('.env file exists and configured');
}

function checkGitignore() {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    CHECKS.CRITICAL.push('.gitignore file not found');
    return;
  }
  
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  if (!gitignoreContent.includes('.env')) {
    CHECKS.CRITICAL.push('.env not in .gitignore - secrets may be committed');
  }
  
  CHECKS.INFO.push('.gitignore properly configured');
}

function checkPackageVulnerabilities() {
  const { execSync } = require('child_process');
  
  try {
    execSync('npm audit --audit-level=high', { stdio: 'pipe' });
    CHECKS.INFO.push('No high/critical npm vulnerabilities found');
  } catch (error) {
    CHECKS.WARNING.push('High/critical npm vulnerabilities detected - run: npm audit fix');
  }
}

function checkDatabaseConfig() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) return;
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for default database credentials
  if (envContent.includes('DB_PASSWORD=postgres') || 
      envContent.includes('DB_USER=postgres')) {
    CHECKS.CRITICAL.push('Using default database credentials - change in production');
  }
  
  if (envContent.includes('DB_HOST=localhost')) {
    CHECKS.WARNING.push('Database host is localhost - ensure this is correct for production');
  }
}

function checkSSLConfig() {
  CHECKS.INFO.push('Remember to configure SSL/TLS certificates for production');
  CHECKS.INFO.push('Use Let\'s Encrypt or your cloud provider\'s certificate service');
}

function checkRateLimiting() {
  const appPath = path.join(__dirname, '..', 'services', 'api', 'src', 'app.ts');
  
  if (!fs.existsSync(appPath)) {
    CHECKS.WARNING.push('Cannot verify rate limiting configuration');
    return;
  }
  
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  if (appContent.includes('generalRateLimit')) {
    CHECKS.INFO.push('Rate limiting is configured');
  } else {
    CHECKS.WARNING.push('Rate limiting may not be configured');
  }
}

function printResults() {
  console.log('\n🔒 Security Audit Report');
  console.log('═'.repeat(80));
  
  if (CHECKS.CRITICAL.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES (Must fix before production):');
    console.log('─'.repeat(80));
    CHECKS.CRITICAL.forEach((check, i) => {
      console.log(`${i + 1}. ❌ ${check}`);
    });
  }
  
  if (CHECKS.WARNING.length > 0) {
    console.log('\n⚠️  WARNINGS (Should fix):');
    console.log('─'.repeat(80));
    CHECKS.WARNING.forEach((check, i) => {
      console.log(`${i + 1}. ⚠️  ${check}`);
    });
  }
  
  if (CHECKS.INFO.length > 0) {
    console.log('\n✅ PASSED CHECKS:');
    console.log('─'.repeat(80));
    CHECKS.INFO.forEach((check, i) => {
      console.log(`${i + 1}. ✅ ${check}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  
  if (CHECKS.CRITICAL.length === 0 && CHECKS.WARNING.length === 0) {
    console.log('✅ All security checks passed! Ready for production.');
    console.log('\n📋 Next steps:');
    console.log('1. Review PRODUCTION_DEPLOYMENT_CHECKLIST.md');
    console.log('2. Set up monitoring and logging');
    console.log('3. Configure backups');
    console.log('4. Test in staging environment first\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${CHECKS.CRITICAL.length} critical issues and ${CHECKS.WARNING.length} warnings`);
    console.log('\n📋 Action items:');
    console.log('1. Fix all critical issues before deploying');
    console.log('2. Review and address warnings');
    console.log('3. Run: node scripts/generate-secrets.js');
    console.log('4. Review: PRODUCTION_DEPLOYMENT_CHECKLIST.md\n');
    process.exit(CHECKS.CRITICAL.length > 0 ? 1 : 0);
  }
}

// Run all checks
console.log('🔍 Running security audit...\n');

checkEnvFile();
checkGitignore();
checkDatabaseConfig();
checkRateLimiting();
checkSSLConfig();
checkPackageVulnerabilities();

printResults();
