"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generators = exports.PBT_CONFIG = void 0;
// Test setup for simplified seller registration
const config_1 = require("@shambit/config");
const fc = __importStar(require("fast-check"));
// Set test environment
process.env.NODE_ENV = 'test';
// Configure test database
const config = (0, config_1.getConfig)();
// Global test timeout
jest.setTimeout(30000);
// Property-based testing configuration
exports.PBT_CONFIG = {
    numRuns: 100, // Minimum 100 iterations as per design document
    timeout: 5000,
    verbose: true,
    seed: 42, // For reproducible tests
    endOnFailure: true
};
// Configure fast-check globally
fc.configureGlobal({
    numRuns: exports.PBT_CONFIG.numRuns,
    verbose: exports.PBT_CONFIG.verbose,
    seed: exports.PBT_CONFIG.seed,
    endOnFailure: exports.PBT_CONFIG.endOnFailure
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
exports.generators = {
    // Indian mobile number generator
    indianMobile: () => fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
    // Email generator
    email: () => fc.emailAddress(),
    // Full name generator
    fullName: () => fc.string({ minLength: 2, maxLength: 100 })
        .filter(s => /^[a-zA-Z\s.'-]+$/.test(s) && s.trim().length >= 2),
    // Password generator (meets requirements)
    strongPassword: () => fc.string({ minLength: 8, maxLength: 50 })
        .filter(s => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(s)),
    // OTP generator
    otp: () => fc.integer({ min: 100000, max: 999999 }).map(n => n.toString().padStart(6, '0')),
    // Registration form data generator
    registrationFormData: () => fc.record({
        fullName: exports.generators.fullName(),
        mobile: exports.generators.indianMobile(),
        email: exports.generators.email(),
        password: exports.generators.strongPassword()
    })
};
//# sourceMappingURL=setup.js.map