#!/usr/bin/env node

/**
 * API Detection Script
 * Automatically detects the correct API server URL and updates .env file
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

// Get network interfaces
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces()
  const addresses = []

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address)
      }
    }
  }

  return addresses
}

// Test API connectivity
async function testApiUrl(baseUrl) {
  try {
    const fetch = (await import('node-fetch')).default
    // Test with a simple GET request to the API base
    const response = await fetch(baseUrl, {
      timeout: 3000
    })
    // Even if it returns 404, it means the server is responding
    return response.status === 404 || response.ok
  } catch (error) {
    return false
  }
}

// Main detection logic
async function detectApiUrl() {
  console.log('🔍 Detecting API server...')
  
  const candidates = [
    'http://localhost:3000/api/v1',
    'http://127.0.0.1:3000/api/v1',
  ]

  // Add network interface candidates
  const networkAddresses = getNetworkInterfaces()
  for (const address of networkAddresses) {
    candidates.push(`http://${address}:3000/api/v1`)
  }

  console.log(`Testing ${candidates.length} possible API URLs...`)

  for (const url of candidates) {
    console.log(`  Testing: ${url}`)
    const isReachable = await testApiUrl(url)
    
    if (isReachable) {
      console.log(`✅ Found API server at: ${url}`)
      return url
    }
  }

  console.log('❌ No API server found')
  return null
}

// Update .env file
function updateEnvFile(apiUrl) {
  const envPath = path.join(__dirname, '..', '.env')
  let envContent = ''

  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Update or add VITE_API_BASE_URL
  const apiUrlLine = `VITE_API_BASE_URL=${apiUrl}`
  
  if (envContent.includes('VITE_API_BASE_URL=')) {
    // Replace existing line
    envContent = envContent.replace(/VITE_API_BASE_URL=.*/, apiUrlLine)
  } else {
    // Add new line
    envContent += envContent.endsWith('\n') ? '' : '\n'
    envContent += apiUrlLine + '\n'
  }

  fs.writeFileSync(envPath, envContent)
  console.log(`📝 Updated .env file with: ${apiUrlLine}`)
}

// Main execution
async function main() {
  try {
    const apiUrl = await detectApiUrl()
    
    if (apiUrl) {
      updateEnvFile(apiUrl)
      console.log('🎉 API detection completed successfully!')
      console.log('💡 You may need to restart the development server for changes to take effect.')
    } else {
      console.log('⚠️  Could not detect API server. Please ensure:')
      console.log('   1. The API server is running (npm run dev in services/api)')
      console.log('   2. The server is accessible on port 3000')
      console.log('   3. Your firewall allows connections to port 3000')
    }
  } catch (error) {
    console.error('❌ Error during API detection:', error.message)
    process.exit(1)
  }
}

main()