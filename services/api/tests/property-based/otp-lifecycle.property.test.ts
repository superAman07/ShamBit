import * as fc from 'fast-check';
import { enhancedOTPService } from '../../src/services/enhanced-otp.service';
import { generators, PBT_CONFIG } from '../setup';
import { PROPERTY_TAGS } from './pbt.config';

// Mock the database module
jest.mock('@shambit/database', () => {
  const mockDb = jest.fn(() => ({
    // Mock query builder methods
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue([{ count: '0' }]),
    insert: jest.fn().mockResolvedValue([{ id: 'test-otp-id' }]),
    update: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(0),
    returning: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
  }));

  // Make the mock function callable as a table selector
  Object.assign(mockDb, {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue([{ count: '0' }]),
    insert: jest.fn().mockResolvedValue([{ id: 'test-otp-id' }]),
    update: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(0),
    returning: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
  });

  return {
    getDatabase: jest.fn(() => mockDb),
    initializeDatabase: jest.fn(),
    closeDatabase: jest.fn(),
  };
});

// Mock the SMS service
jest.mock('../../src/services/sms.service', () => ({
  smsService: {
    sendOTP: jest.fn().mockResolvedValue({ success: true, messageId: 'test-msg-id' })
  }
}));

describe('OTP Lifecycle Property-Based Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Property 3: OTP Generation and Verification', () => {
    test('Property 3.1: Valid mobile numbers should generate proper OTP structure', async () => {
      // **Feature: simplified-seller-registration, Property 3: OTP Generation and Verification**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          fc.constantFrom('sms', 'whatsapp'),
          fc.ipV4(),
          async (mobile: string, method: 'sms' | 'whatsapp', ipAddress: string) => {
            // Property: For any valid mobile number and method, OTP generation should return proper structure
            const result = await enhancedOTPService.generateAndSendOTP(mobile, method, ipAddress);
            
            // Should return proper response structure
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.expiresIn).toBe('number');
            expect(['pending', 'sent', 'delivered', 'failed']).toContain(result.deliveryStatus);
            expect(['sms', 'whatsapp']).toContain(result.method);
            expect(typeof result.attemptsRemaining).toBe('number');
            
            // If successful, should have valid expiry time and OTP ID
            if (result.success) {
              expect(result.expiresIn).toBe(300); // 5 minutes
              expect(result.otpId).toBeDefined();
              expect(typeof result.otpId).toBe('string');
              expect(result.attemptsRemaining).toBeGreaterThanOrEqual(0);
              expect(result.attemptsRemaining).toBeLessThanOrEqual(3);
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 3.2: Invalid mobile numbers should always fail OTP generation', async () => {
      // **Feature: simplified-seller-registration, Property 3: OTP Generation and Verification**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.invalidMobile(),
          fc.constantFrom('sms', 'whatsapp'),
          fc.ipV4(),
          async (invalidMobile: string, method: 'sms' | 'whatsapp', ipAddress: string) => {
            // Property: For any invalid mobile number, OTP generation should fail
            const result = await enhancedOTPService.generateAndSendOTP(invalidMobile, method, ipAddress);
            
            // Should fail for invalid mobile numbers
            expect(result.success).toBe(false);
            expect(result.expiresIn).toBe(0);
            expect(result.deliveryStatus).toBe('failed');
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid mobile number format');
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 3.3: OTP format validation should reject invalid OTP formats', async () => {
      // **Feature: simplified-seller-registration, Property 3: OTP Generation and Verification**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 5 }), // Too short
            fc.string({ minLength: 7, maxLength: 10 }), // Too long
            fc.string({ minLength: 6, maxLength: 6 }).filter(s => !/^\d{6}$/.test(s)), // Non-numeric
            fc.constant(''), // Empty
            fc.constant('   '), // Whitespace
            fc.constant('abcdef'), // Letters
            fc.constant('12345a'), // Mixed
            fc.constant('123-456') // With special chars
          ),
          fc.ipV4(),
          async (mobile: string, invalidOTP: string, ipAddress: string) => {
            // Property: For any invalid OTP format, verification should fail with format error
            const result = await enhancedOTPService.verifyOTP(mobile, invalidOTP, ipAddress);
            
            // Should fail for invalid OTP format
            expect(result.success).toBe(false);
            expect(result.verified).toBe(false);
            expect(result.attemptsRemaining).toBe(0);
            expect(result.cooldownActive).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid mobile number or OTP format');
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 3.4: Valid OTP format should be processed correctly', async () => {
      // **Feature: simplified-seller-registration, Property 3: OTP Generation and Verification**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          generators.otp(),
          fc.ipV4(),
          async (mobile: string, validOTP: string, ipAddress: string) => {
            // Property: For any valid mobile and OTP format, verification should return proper structure
            const result = await enhancedOTPService.verifyOTP(mobile, validOTP, ipAddress);
            
            // Should return proper response structure
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.verified).toBe('boolean');
            expect(typeof result.attemptsRemaining).toBe('number');
            expect(typeof result.cooldownActive).toBe('boolean');
            
            // Attempts remaining should be within valid range
            expect(result.attemptsRemaining).toBeGreaterThanOrEqual(0);
            expect(result.attemptsRemaining).toBeLessThanOrEqual(3);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });
  });

  describe('Property 4: OTP Lifecycle Management', () => {
    test('Property 4.1: OTP resend should respect cooldown periods', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          fc.constantFrom('sms', 'whatsapp'),
          fc.ipV4(),
          async (mobile: string, method: 'sms' | 'whatsapp', ipAddress: string) => {
            // Property: Resend should return proper structure and handle cooldown logic
            const resendResult = await enhancedOTPService.resendOTP(mobile, method, ipAddress);
            
            // Should return proper response structure
            expect(typeof resendResult.success).toBe('boolean');
            expect(typeof resendResult.expiresIn).toBe('number');
            expect(['pending', 'sent', 'delivered', 'failed']).toContain(resendResult.deliveryStatus);
            expect(['sms', 'whatsapp']).toContain(resendResult.method);
            expect(typeof resendResult.attemptsRemaining).toBe('number');
            
            // If cooldown is active, should have cooldown seconds
            if (!resendResult.success && resendResult.cooldownSeconds !== undefined) {
              expect(resendResult.cooldownSeconds).toBeGreaterThan(0);
              expect(resendResult.cooldownSeconds).toBeLessThanOrEqual(60);
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 4.2: OTP status should return consistent structure', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          async (mobile: string) => {
            // Property: OTP status should always return consistent structure
            const status = await enhancedOTPService.getOTPStatus(mobile);
            
            // Should return proper structure
            expect(typeof status.hasActiveOTP).toBe('boolean');
            
            // If has active OTP, should have additional fields
            if (status.hasActiveOTP) {
              expect(status.expiresAt).toBeDefined();
              expect(typeof status.attempts).toBe('number');
              expect(status.deliveryStatus).toBeDefined();
              expect(['pending', 'sent', 'delivered', 'failed']).toContain(status.deliveryStatus);
              expect(status.method).toBeDefined();
              expect(['sms', 'whatsapp']).toContain(status.method);
              
              // Attempts should be within valid range
              if (typeof status.attempts === 'number') {
                expect(status.attempts).toBeGreaterThanOrEqual(0);
                expect(status.attempts).toBeLessThanOrEqual(3);
              }
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 4.3: Cleanup expired OTPs should return valid count', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed for cleanup test
          async () => {
            // Property: Cleanup should return a valid count
            const cleanedCount = await enhancedOTPService.cleanupExpiredOTPs();
            
            // Should return a non-negative number
            expect(typeof cleanedCount).toBe('number');
            expect(cleanedCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: Math.floor(PBT_CONFIG.numRuns / 4) }
      );
    });

    test('Property 4.4: Delivery statistics should return valid structure', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('hour', 'day', 'week'),
          async (timeframe: 'hour' | 'day' | 'week') => {
            // Property: Statistics should return valid structure with proper ranges
            const stats = await enhancedOTPService.getDeliveryStats(timeframe);
            
            // Should return proper structure
            expect(typeof stats.total).toBe('number');
            expect(typeof stats.sent).toBe('number');
            expect(typeof stats.failed).toBe('number');
            expect(typeof stats.smsCount).toBe('number');
            expect(typeof stats.whatsappCount).toBe('number');
            expect(typeof stats.successRate).toBe('number');
            
            // All counts should be non-negative
            expect(stats.total).toBeGreaterThanOrEqual(0);
            expect(stats.sent).toBeGreaterThanOrEqual(0);
            expect(stats.failed).toBeGreaterThanOrEqual(0);
            expect(stats.smsCount).toBeGreaterThanOrEqual(0);
            expect(stats.whatsappCount).toBeGreaterThanOrEqual(0);
            
            // Success rate should be between 0 and 100
            expect(stats.successRate).toBeGreaterThanOrEqual(0);
            expect(stats.successRate).toBeLessThanOrEqual(100);
            
            // Sent + failed should not exceed total
            expect(stats.sent + stats.failed).toBeLessThanOrEqual(stats.total);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 4.5: Mobile number validation should be consistent', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(generators.indianMobile(), generators.invalidMobile()),
          async (mobile: string) => {
            // Property: Mobile validation should be consistent across all operations
            const isValidMobile = /^[6-9]\d{9}$/.test(mobile);
            
            // Test OTP generation
            const generateResult = await enhancedOTPService.generateAndSendOTP(mobile, 'sms');
            
            if (isValidMobile) {
              // Valid mobile should either succeed or fail due to rate limiting, not format
              if (!generateResult.success && generateResult.error) {
                expect(generateResult.error).not.toContain('Invalid mobile number format');
              }
            } else {
              // Invalid mobile should always fail with format error
              expect(generateResult.success).toBe(false);
              expect(generateResult.error).toContain('Invalid mobile number format');
            }
            
            // Test OTP verification
            const verifyResult = await enhancedOTPService.verifyOTP(mobile, '123456');
            
            if (!isValidMobile) {
              // Invalid mobile should fail verification with format error
              expect(verifyResult.success).toBe(false);
              expect(verifyResult.error).toContain('Invalid mobile number or OTP format');
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    test('Property 4.6: OTP format validation should be consistent', async () => {
      // **Feature: simplified-seller-registration, Property 4: OTP Lifecycle Management**
      // **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
      
      await fc.assert(
        fc.asyncProperty(
          generators.indianMobile(),
          fc.oneof(
            generators.otp(), // Valid OTP
            fc.string({ minLength: 1, maxLength: 5 }), // Too short
            fc.string({ minLength: 7, maxLength: 10 }), // Too long
            fc.string({ minLength: 6, maxLength: 6 }).filter(s => !/^\d{6}$/.test(s)), // Non-numeric
            fc.constant(''), // Empty
            fc.constant('abcdef') // Letters
          ),
          async (mobile: string, otp: string) => {
            // Property: OTP format validation should be consistent
            const isValidOTP = /^\d{6}$/.test(otp);
            
            const verifyResult = await enhancedOTPService.verifyOTP(mobile, otp);
            
            if (!isValidOTP) {
              // Invalid OTP format should always fail with format error
              expect(verifyResult.success).toBe(false);
              expect(verifyResult.error).toContain('Invalid mobile number or OTP format');
              expect(verifyResult.attemptsRemaining).toBe(0);
              expect(verifyResult.cooldownActive).toBe(false);
            } else {
              // Valid OTP format should be processed (may still fail due to wrong OTP, but not format)
              if (!verifyResult.success && verifyResult.error) {
                expect(verifyResult.error).not.toContain('Invalid mobile number or OTP format');
              }
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });
  });
});