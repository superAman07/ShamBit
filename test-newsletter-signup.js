// Simple test script to verify newsletter signup functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1'; // API runs on port 3000 with v1 prefix

async function testNewsletterSignup() {
    try {
        console.log('🧪 Testing Newsletter Signup...');
        
        const testEmail = `test-${Date.now()}@example.com`;
        
        // Test signup
        const signupResponse = await axios.post(`${API_BASE_URL}/newsletter/signup`, {
            email: testEmail,
            source: 'test',
            metadata: {
                test: true,
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('✅ Signup successful:', signupResponse.data);
        
        // Test duplicate signup
        try {
            await axios.post(`${API_BASE_URL}/newsletter/signup`, {
                email: testEmail,
                source: 'test'
            });
            console.log('❌ Duplicate signup should have failed');
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('✅ Duplicate signup correctly rejected');
            } else {
                console.log('❌ Unexpected error on duplicate signup:', error.response?.data);
            }
        }
        
        // Test unsubscribe
        const unsubscribeResponse = await axios.post(`${API_BASE_URL}/newsletter/unsubscribe`, {
            email: testEmail
        });
        
        console.log('✅ Unsubscribe successful:', unsubscribeResponse.data);
        
        console.log('🎉 All newsletter tests passed!');
        
    } catch (error) {
        console.error('❌ Newsletter test failed:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
    }
}

// Run the test
testNewsletterSignup();