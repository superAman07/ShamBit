#!/usr/bin/env node

/**
 * Generate secure secrets for production deployment
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('\n🔐 Production Secrets Generator\n');
console.log('Copy these values to your .env file:\n');
console.log('─'.repeat(80));

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log(`JWT_SECRET=${jwtSecret}`);

// Generate JWT Refresh Secret
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);

// Generate Encryption Key
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

console.log('─'.repeat(80));
console.log('\n⚠️  IMPORTANT:');
console.log('1. Never commit these secrets to version control');
console.log('2. Store them securely in your deployment platform');
console.log('3. Use different secrets for each environment (dev, staging, prod)');
console.log('4. Rotate secrets regularly (quarterly recommended)\n');
