import { TestEnvironmentHelper } from './utils/test-helpers';

// Set up test environment variables
TestEnvironmentHelper.setTestEnvironmentVariables();

// Global test setup
beforeAll(async () => {
  // Set up global test configuration
  process.env.NODE_ENV = 'test';

  // Suppress console logs during tests (optional)
  if (process.env.SUPPRESS_LOGS === 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up test environment
  TestEnvironmentHelper.cleanupTestEnvironment();

  // Restore console methods
  if (process.env.SUPPRESS_LOGS === 'true') {
    jest.restoreAllMocks();
  }
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for all tests

// Mock external services by default
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));

jest.mock('twilio', () => ({
  Twilio: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-message-sid' }),
    },
  })),
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue('test-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
  })),
}));

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
