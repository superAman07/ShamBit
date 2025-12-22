import { Router } from 'express';
import { otpService } from '../services';

const router = Router();

// Simple seller registration route
router.post('/seller-registration/register', async (req, res) => {
  try {
    console.log('Simple seller registration endpoint hit:', req.body);
    
    // Basic validation
    const { fullName, mobile, email, password } = req.body;
    
    if (!fullName || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Send OTP for mobile verification
    console.log('🚀 Attempting to send OTP to:', mobile);
    const otpResult = await otpService.generateAndSendOTP(mobile, 'verification');
    
    if (!otpResult.success) {
      console.error('❌ Failed to send OTP:', otpResult.error);
    } else {
      console.log('✅ OTP generation successful');
    }
    
    // Return success response
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration working! OTP sent for verification.',
        otpSent: otpResult.success,
        expiresIn: 300
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Simple OTP verification route
router.post('/seller-registration/verify-otp', async (req, res) => {
  try {
    console.log('🔍 OTP verification endpoint hit:', req.body);
    
    // Basic validation
    const { mobile, otp } = req.body;
    
    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mobile and OTP are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP_FORMAT',
          message: 'OTP must be exactly 6 digits',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Verify OTP
    console.log('🔐 Attempting to verify OTP for:', mobile);
    const isValid = await otpService.verifyOTP(mobile, otp, 'verification');
    
    if (!isValid) {
      console.log('❌ OTP verification failed');
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Invalid or expired OTP',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log('✅ OTP verification successful');
    
    // Return success response
    res.json({
      success: true,
      data: {
        message: 'OTP verification successful!',
        verified: true
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'OTP verification failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple routes working!',
    timestamp: new Date().toISOString()
  });
});

export default router;