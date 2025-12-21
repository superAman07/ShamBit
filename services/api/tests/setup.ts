// Test setup for simplified seller registration
import { getConfig } from '@shambit/config';
import * as fc from 'fast-check';

// Set test environment
process.env.NODE_ENV = 'test';

// Configure test database
const config = getConfig();

// Global test timeout
jest.setTimeout(30000);

// Property-based testing configuration
export const PBT_CONFIG = {
  numRuns: 100, // Minimum 100 iterations as per design document
  timeout: 5000,
  verbose: true,
  seed: 42, // For reproducible tests
  endOnFailure: true
};

// Configure fast-check globally
fc.configureGlobal({
  numRuns: PBT_CONFIG.numRuns,
  verbose: PBT_CONFIG.verbose,
  seed: PBT_CONFIG.seed,
  endOnFailure: PBT_CONFIG.endOnFailure
});

// Setup global test utilities
global.beforeAll(async () => {
  // Initialize test database connection if needed
  console.log('Setting up test environment...');
});

global.afterAll(async () => {
  // Cleanup test database connections
  console.log('Cleaning up test environment...');
});

// Mock external services for testing
jest.mock('../src/services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'test-msg-id' })
}));

jest.mock('../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-email-id' })
}));

// Test data generators for property-based testing
export const generators = {
  // Indian mobile number generator
  indianMobile: () => fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
  
  // Invalid mobile number generator (for testing validation)
  invalidMobile: () => fc.oneof(
    // Too short
    fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
    // Too long
    fc.integer({ min: 10000000000, max: 99999999999 }).map(n => n.toString()),
    // Starts with invalid digit (0-5)
    fc.integer({ min: 1000000000, max: 5999999999 }).map(n => n.toString()),
    // Contains non-digits
    fc.constant('98765abcde'),
    fc.constant('9876-54321'),
    fc.constant('+919876543210'),
    // Empty or whitespace
    fc.constant(''),
    fc.constant('   ')
  ),
  
  // Email generator
  email: () => fc.emailAddress(),
  
  // Invalid email generator (for testing validation)
  invalidEmail: () => fc.oneof(
    // Missing @
    fc.constant('testexample.com'),
    // Missing domain
    fc.constant('test@'),
    // Missing TLD
    fc.constant('test@example'),
    // Multiple @
    fc.constant('test@@example.com'),
    // Spaces
    fc.constant('test @example.com'),
    fc.constant('test@ example.com'),
    // Empty
    fc.constant(''),
    // Just @
    fc.constant('@'),
    // Just domain
    fc.constant('@example.com'),
    // Invalid characters
    fc.constant('test..test@example.com'),
    fc.constant('test@exam ple.com')
  ),
  
  // Full name generator
  fullName: () => fc.string({ minLength: 2, maxLength: 100 })
    .filter(s => /^[a-zA-Z\s.'-]+$/.test(s) && s.trim().length >= 2),
  
  // Password generator (meets requirements)
  strongPassword: () => fc.string({ minLength: 8, maxLength: 50 })
    .filter(s => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(s)),
  
  // Weak password generator (for testing validation)
  weakPassword: () => fc.oneof(
    // Too short
    fc.string({ minLength: 1, maxLength: 7 }),
    // No uppercase
    fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /^[a-z\d@$!%*?&]+$/.test(s) && !/[A-Z]/.test(s)),
    // No lowercase
    fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /^[A-Z\d@$!%*?&]+$/.test(s) && !/[a-z]/.test(s)),
    // No digits
    fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /^[a-zA-Z@$!%*?&]+$/.test(s) && !/\d/.test(s)),
    // No special characters
    fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /^[a-zA-Z\d]+$/.test(s) && !/[@$!%*?&]/.test(s)),
    // Empty
    fc.constant(''),
    // Only spaces
    fc.constant('        ')
  ),
  
  // OTP generator
  otp: () => fc.integer({ min: 100000, max: 999999 }).map(n => n.toString().padStart(6, '0')),
  
  // Registration form data generator
  registrationFormData: () => fc.record({
    fullName: fc.string({ minLength: 2, maxLength: 100 })
      .filter(s => /^[a-zA-Z\s.'-]+$/.test(s) && s.trim().length >= 2),
    mobile: fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
    email: fc.emailAddress(),
    password: fc.string({ minLength: 8, maxLength: 50 })
      .filter(s => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(s))
  })
};