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
const fc = __importStar(require("fast-check"));
const setup_1 = require("../setup");
describe('Seller Registration Property-Based Tests', () => {
    describe('Registration Data Validation Properties', () => {
        test('Property: Valid registration data should always pass validation', () => {
            fc.assert(fc.property(setup_1.generators.registrationFormData(), (formData) => {
                // Property: All generated valid registration data should pass basic validation
                expect(formData.fullName).toMatch(/^[a-zA-Z\s.'-]+$/);
                expect(formData.fullName.length).toBeGreaterThanOrEqual(2);
                expect(formData.fullName.length).toBeLessThanOrEqual(100);
                expect(formData.mobile).toMatch(/^[6-9]\d{9}$/);
                expect(formData.mobile.length).toBe(10);
                expect(formData.email).toContain('@');
                expect(formData.email).toContain('.');
                expect(formData.password.length).toBeGreaterThanOrEqual(8);
                expect(formData.password).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/);
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
        test('Property: Mobile numbers should always be 10 digits starting with 6-9', () => {
            fc.assert(fc.property(setup_1.generators.indianMobile(), (mobile) => {
                // Property: All generated mobile numbers should be valid Indian mobile numbers
                expect(mobile).toMatch(/^[6-9]\d{9}$/);
                expect(mobile.length).toBe(10);
                expect(['6', '7', '8', '9']).toContain(mobile[0]);
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
        test('Property: Generated OTPs should always be 6 digits', () => {
            fc.assert(fc.property(setup_1.generators.otp(), (otp) => {
                // Property: All generated OTPs should be exactly 6 digits
                expect(otp).toMatch(/^\d{6}$/);
                expect(otp.length).toBe(6);
                expect(parseInt(otp)).toBeGreaterThanOrEqual(0);
                expect(parseInt(otp)).toBeLessThanOrEqual(999999);
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
        test('Property: Strong passwords should meet all security requirements', () => {
            fc.assert(fc.property(setup_1.generators.strongPassword(), (password) => {
                // Property: All generated strong passwords should meet security criteria
                expect(password.length).toBeGreaterThanOrEqual(8);
                expect(password).toMatch(/[a-z]/); // lowercase
                expect(password).toMatch(/[A-Z]/); // uppercase
                expect(password).toMatch(/\d/); // digit
                expect(password).toMatch(/[@$!%*?&]/); // special character
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
    });
    describe('Email Validation Properties', () => {
        test('Property: Generated emails should always be valid format', () => {
            fc.assert(fc.property(setup_1.generators.email(), (email) => {
                // Property: All generated emails should have valid format
                expect(email).toContain('@');
                expect(email).toContain('.');
                expect(email.indexOf('@')).toBeGreaterThan(0);
                expect(email.lastIndexOf('.')).toBeGreaterThan(email.indexOf('@'));
                expect(email.length).toBeGreaterThan(5); // Minimum reasonable email length
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
    });
    describe('Full Name Validation Properties', () => {
        test('Property: Generated full names should only contain allowed characters', () => {
            fc.assert(fc.property(setup_1.generators.fullName(), (fullName) => {
                // Property: All generated full names should contain only letters, spaces, dots, hyphens, apostrophes
                expect(fullName).toMatch(/^[a-zA-Z\s.'-]+$/);
                expect(fullName.trim().length).toBeGreaterThanOrEqual(2);
                expect(fullName.length).toBeLessThanOrEqual(100);
            }), { numRuns: setup_1.PBT_CONFIG.numRuns });
        });
    });
});
//# sourceMappingURL=seller-registration.property.test.js.map