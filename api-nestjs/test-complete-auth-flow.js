#!/usr/bin/env node

/**
 * Complete Authentication Flow Test
 * Tests all phases including the fixed refresh endpoint
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';

class CompleteAuthTester {
  constructor() {
    this.testEmail = `test-${Date.now()}@example.com`;
    this.testPassword = 'testpassword123';
    this.cookies = {};
  }

  async runCompleteTest() {
    console.log('🔒 Complete Authentication Flow Test\n');
    console.log(`Testing with email: ${this.testEmail}\n`);

    try {
      await this.phase1_Registration();
      await this.phase2_ProfileAccess();
      await this.phase3_Logout();
      await this.phase4_LoginAgain();
      await this.phase5_RefreshToken(); // This should now work!
      await this.phase6_LogoutAndVerify();
      
      console.log('\n🎉 ALL PHASES COMPLETED SUCCESSFULLY!');
      console.log('✅ Registration with secure cookies');
      console.log('✅ Profile access via cookies');
      console.log('✅ Logout with token revocation');
      console.log('✅ Login flow');
      console.log('✅ Refresh token from cookies (FIXED!)');
      console.log('✅ Final logout verification');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  async phase1_Registration() {
    console.log('Phase 1: Registration with Secure Cookies');
    
    const response = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User',
      email: this.testEmail,
      password: this.testPassword
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
    }

    // Extract cookies
    this.cookies = this.extractCookies(response.headers['set-cookie']);
    
    console.log('✅ Registration successful');
    console.log(`   Cookies received: ${Object.keys(this.cookies).join(', ')}`);
    
    // Verify no tokens in response body
    if (response.data.accessToken || response.data.refreshToken) {
      throw new Error('Tokens should not be in response body!');
    }
    console.log('✅ No tokens in response body (secure!)');
    console.log('');
  }

  async phase2_ProfileAccess() {
    console.log('Phase 2: Profile Access via Cookies');
    
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Cookie': this.formatCookies(this.cookies)
      }
    });

    if (response.status !== 200) {
      throw new Error(`Profile access failed: ${response.status}`);
    }

    console.log('✅ Profile access successful via cookies');
    console.log(`   User: ${response.data.name} (${response.data.email})`);
    console.log('');
  }

  async phase3_Logout() {
    console.log('Phase 3: Logout (Token Revocation)');
    
    const response = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: {
        'Cookie': this.formatCookies(this.cookies)
      }
    });

    if (response.status !== 200) {
      throw new Error(`Logout failed: ${response.status}`);
    }

    console.log('✅ Logout successful');
    
    // Verify tokens are revoked
    try {
      await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Cookie': this.formatCookies(this.cookies)
        }
      });
      throw new Error('Profile should be inaccessible after logout');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Access properly revoked after logout');
      } else {
        throw error;
      }
    }
    console.log('');
  }

  async phase4_LoginAgain() {
    console.log('Phase 4: Login Again');
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: this.testEmail,
      password: this.testPassword
    }, {
      withCredentials: true
    });

    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }

    // Update cookies
    this.cookies = this.extractCookies(response.headers['set-cookie']);
    
    console.log('✅ Login successful');
    console.log(`   New cookies received: ${Object.keys(this.cookies).join(', ')}`);
    console.log('');
  }

  async phase5_RefreshToken() {
    console.log('Phase 5: Refresh Token from Cookies (THE FIX!)');
    
    const response = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      headers: {
        'Cookie': this.formatCookies(this.cookies)
      },
      withCredentials: true
    });

    if (response.status !== 200) {
      throw new Error(`Refresh failed: ${JSON.stringify(response.data)}`);
    }

    // Update cookies with new tokens
    const newCookies = this.extractCookies(response.headers['set-cookie']);
    if (Object.keys(newCookies).length > 0) {
      this.cookies = { ...this.cookies, ...newCookies };
    }
    
    console.log('✅ Token refresh successful from cookies!');
    console.log('✅ This was the issue that is now FIXED!');
    
    // Verify new tokens work
    const profileResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Cookie': this.formatCookies(this.cookies)
      }
    });

    if (profileResponse.status === 200) {
      console.log('✅ New tokens are working correctly');
    }
    console.log('');
  }

  async phase6_LogoutAndVerify() {
    console.log('Phase 6: Final Logout and Verification');
    
    const response = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: {
        'Cookie': this.formatCookies(this.cookies)
      }
    });

    if (response.status !== 200) {
      throw new Error(`Final logout failed: ${response.status}`);
    }

    console.log('✅ Final logout successful');
    
    // Final verification
    try {
      await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Cookie': this.formatCookies(this.cookies)
        }
      });
      throw new Error('Profile should be inaccessible after final logout');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Final verification: Access properly denied');
      } else {
        throw error;
      }
    }
    console.log('');
  }

  extractCookies(setCookieHeaders) {
    if (!setCookieHeaders) return {};
    
    const cookies = {};
    setCookieHeaders.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        cookies[name.trim()] = value;
      }
    });
    return cookies;
  }

  formatCookies(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

// Run the complete test
if (require.main === module) {
  const tester = new CompleteAuthTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = CompleteAuthTester;