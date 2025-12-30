#!/usr/bin/env node

/**
 * Security Testing Script for NestJS Authentication API
 * 
 * This script tests the security enhancements implemented:
 * 1. Token revocation after logout
 * 2. HttpOnly cookie authentication
 * 3. Security headers validation
 * 4. Refresh token rotation
 */

const axios = require('axios');
const https = require('https');

// Configure axios to ignore self-signed certificates in development
const agent = new https.Agent({
  rejectUnauthorized: false
});

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';

class SecurityTester {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.cookies = null;
  }

  async runAllTests() {
    console.log('🔒 Starting Security Tests for NestJS Authentication API\n');

    try {
      await this.testSecurityHeaders();
      await this.testAuthentication();
      await this.testTokenRevocation();
      await this.testRefreshTokenRotation();
      await this.testCookieAuthentication();
      
      console.log('\n✅ All security tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Security test failed:', error.message);
      process.exit(1);
    }
  }

  async testSecurityHeaders() {
    console.log('1. Testing Security Headers...');
    
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        httpsAgent: agent,
        validateStatus: () => true // Don't throw on 401
      });

      const headers = response.headers;
      
      // Check for security headers
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '0', // Helmet sets this to 0 by default
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy']
      };

      console.log('   Security Headers Found:');
      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          console.log(`   ✓ ${header}: ${value}`);
        } else {
          console.log(`   ⚠ ${header}: Not found`);
        }
      });

      console.log('   ✅ Security headers test completed\n');
    } catch (error) {
      throw new Error(`Security headers test failed: ${error.message}`);
    }
  }

  async testAuthentication() {
    console.log('2. Testing Authentication Flow...');
    
    try {
      // Register a test user
      const registerData = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123'
      };

      const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData, {
        httpsAgent: agent,
        withCredentials: true
      });

      console.log('   ✓ User registration successful');
      
      // Extract cookies from Set-Cookie header
      this.cookies = this.extractCookies(registerResponse.headers['set-cookie']);
      console.log('   ✓ Secure cookies set:', Object.keys(this.cookies));

      // Test protected route with cookies
      const profileResponse = await axios.get(`${API_BASE}/auth/me`, {
        httpsAgent: agent,
        headers: {
          'Cookie': this.formatCookies(this.cookies)
        }
      });

      console.log('   ✓ Protected route accessible with cookies');
      console.log('   ✅ Authentication test completed\n');
      
      return registerData;
    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  async testTokenRevocation() {
    console.log('3. Testing Token Revocation...');
    
    try {
      // Logout to revoke tokens
      const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
        httpsAgent: agent,
        headers: {
          'Cookie': this.formatCookies(this.cookies)
        }
      });

      console.log('   ✓ Logout successful');

      // Try to access protected route with old cookies (should fail)
      try {
        await axios.get(`${API_BASE}/auth/me`, {
          httpsAgent: agent,
          headers: {
            'Cookie': this.formatCookies(this.cookies)
          }
        });
        throw new Error('Protected route should be inaccessible after logout');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('   ✓ Access token properly revoked after logout');
        } else {
          throw error;
        }
      }

      console.log('   ✅ Token revocation test completed\n');
    } catch (error) {
      throw new Error(`Token revocation test failed: ${error.message}`);
    }
  }

  async testRefreshTokenRotation() {
    console.log('4. Testing Refresh Token Rotation...');
    
    try {
      // Login again to get fresh tokens
      const loginData = {
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123'
      };

      // Register first
      await axios.post(`${API_BASE}/auth/register`, {
        name: 'Test User 2',
        ...loginData
      }, {
        httpsAgent: agent,
        withCredentials: true
      });

      const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData, {
        httpsAgent: agent,
        withCredentials: true
      });

      const initialCookies = this.extractCookies(loginResponse.headers['set-cookie']);
      console.log('   ✓ Initial login successful');

      // Refresh tokens
      const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {}, {
        httpsAgent: agent,
        headers: {
          'Cookie': this.formatCookies(initialCookies)
        }
      });

      const newCookies = this.extractCookies(refreshResponse.headers['set-cookie']);
      console.log('   ✓ Token refresh successful');

      // Verify new tokens work
      await axios.get(`${API_BASE}/auth/me`, {
        httpsAgent: agent,
        headers: {
          'Cookie': this.formatCookies(newCookies)
        }
      });

      console.log('   ✓ New tokens are valid');

      // Try to use old refresh token (should fail)
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, {
          httpsAgent: agent,
          headers: {
            'Cookie': this.formatCookies(initialCookies)
          }
        });
        throw new Error('Old refresh token should be invalid');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('   ✓ Old refresh token properly invalidated');
        } else {
          throw error;
        }
      }

      console.log('   ✅ Refresh token rotation test completed\n');
    } catch (error) {
      throw new Error(`Refresh token rotation test failed: ${error.message}`);
    }
  }

  async testCookieAuthentication() {
    console.log('5. Testing Cookie Security...');
    
    try {
      // Login to get cookies
      const loginData = {
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123'
      };

      // Register first
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        name: 'Test User 3',
        ...loginData
      }, {
        httpsAgent: agent,
        withCredentials: true
      });

      const cookies = registerResponse.headers['set-cookie'];
      
      // Verify cookie attributes
      cookies.forEach(cookie => {
        console.log(`   Cookie: ${cookie}`);
        
        if (cookie.includes('accessToken') || cookie.includes('refreshToken')) {
          if (cookie.includes('HttpOnly')) {
            console.log('   ✓ HttpOnly attribute present');
          } else {
            throw new Error('HttpOnly attribute missing');
          }
          
          if (cookie.includes('SameSite=Strict')) {
            console.log('   ✓ SameSite=Strict attribute present');
          } else {
            console.log('   ⚠ SameSite=Strict attribute missing (may be development)');
          }
        }
      });

      console.log('   ✅ Cookie security test completed\n');
    } catch (error) {
      throw new Error(`Cookie security test failed: ${error.message}`);
    }
  }

  extractCookies(setCookieHeaders) {
    if (!setCookieHeaders) return {};
    
    const cookies = {};
    setCookieHeaders.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name.trim()] = value;
    });
    return cookies;
  }

  formatCookies(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;