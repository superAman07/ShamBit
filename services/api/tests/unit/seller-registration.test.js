"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const app = (0, app_1.createApp)();
describe('Seller Registration API', () => {
    describe('POST /api/v1/seller-registration/register', () => {
        test('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/register')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toHaveLength(4); // 4 required fields
        });
        test('should validate mobile number format', async () => {
            const invalidData = {
                fullName: 'Test User',
                mobile: '1234567890', // Invalid - doesn't start with 6-9
                email: 'test@example.com',
                password: 'Password123!'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/register')
                .send(invalidData);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some((d) => d.field === 'mobile')).toBe(true);
        });
        test('should validate email format', async () => {
            const invalidData = {
                fullName: 'Test User',
                mobile: '9876543210',
                email: 'invalid-email', // Invalid email format
                password: 'Password123!'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/register')
                .send(invalidData);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some((d) => d.field === 'email')).toBe(true);
        });
        test('should validate password strength', async () => {
            const invalidData = {
                fullName: 'Test User',
                mobile: '9876543210',
                email: 'test@example.com',
                password: 'weak' // Too weak
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/register')
                .send(invalidData);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some((d) => d.field === 'password')).toBe(true);
        });
        test('should accept valid registration data', async () => {
            const validData = {
                fullName: 'Test User',
                mobile: '9876543210',
                email: 'test@example.com',
                password: 'Password123!'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/register')
                .send(validData);
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.sellerId).toBeDefined();
            expect(response.body.data.otpSent).toBe(true);
            expect(response.body.data.expiresIn).toBe(300);
        });
    });
    describe('POST /api/v1/seller-registration/verify-otp', () => {
        test('should validate OTP format', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/verify-otp')
                .send({
                mobile: '9876543210',
                otp: '12345' // Invalid - only 5 digits
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some((d) => d.field === 'otp')).toBe(true);
        });
        test('should validate mobile number format', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/verify-otp')
                .send({
                mobile: '1234567890', // Invalid format
                otp: '123456'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.some((d) => d.field === 'mobile')).toBe(true);
        });
        test('should accept valid OTP verification data', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/verify-otp')
                .send({
                mobile: '9876543210',
                otp: '123456'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.verified).toBe(true);
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.seller).toBeDefined();
        });
    });
    describe('POST /api/v1/seller-registration/resend-otp', () => {
        test('should validate mobile number', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/resend-otp')
                .send({
                mobile: '1234567890' // Invalid format
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        test('should accept valid resend request', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/resend-otp')
                .send({
                mobile: '9876543210',
                method: 'sms'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.sent).toBe(true);
            expect(response.body.data.method).toBe('sms');
        });
    });
    describe('POST /api/v1/seller-registration/login', () => {
        test('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/login')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details).toHaveLength(2); // identifier and password
        });
        test('should accept valid login data', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/seller-registration/login')
                .send({
                identifier: 'test@example.com',
                password: 'Password123!'
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.seller).toBeDefined();
        });
    });
    describe('GET /api/v1/seller-registration/profile/status', () => {
        test('should return profile completion status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/seller-registration/profile/status');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.progress).toBeDefined();
            expect(response.body.data.slaTimelines).toBeDefined();
            expect(response.body.data.productListingEligible).toBeDefined();
            expect(response.body.data.payoutEligible).toBeDefined();
        });
    });
});
//# sourceMappingURL=seller-registration.test.js.map