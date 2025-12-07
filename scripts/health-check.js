#!/usr/bin/env node

/**
 * Health check script for monitoring
 * Usage: node scripts/health-check.js [API_URL]
 * Example: node scripts/health-check.js http://localhost:3000
 */

const http = require('http');
const https = require('https');

const API_URL = process.argv[2] || 'http://localhost:3000';
const HEALTH_ENDPOINT = '/health';

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const fullUrl = `${url}${HEALTH_ENDPOINT}`;
    
    const startTime = Date.now();
    
    protocol.get(fullUrl, { timeout: 5000 }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({
            status: res.statusCode,
            responseTime,
            health
          });
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    }).on('timeout', () => {
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  console.log(`🏥 Checking health of: ${API_URL}`);
  console.log('─'.repeat(60));
  
  try {
    const result = await checkHealth(API_URL);
    
    if (result.status === 200) {
      console.log('✅ Status: HEALTHY');
      console.log(`⏱️  Response Time: ${result.responseTime}ms`);
      console.log('📊 Health Data:');
      console.log(JSON.stringify(result.health, null, 2));
      process.exit(0);
    } else {
      console.log(`❌ Status: UNHEALTHY (HTTP ${result.status})`);
      console.log(`⏱️  Response Time: ${result.responseTime}ms`);
      console.log('📊 Response:');
      console.log(JSON.stringify(result.health, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Status: UNREACHABLE');
    console.log(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

main();
