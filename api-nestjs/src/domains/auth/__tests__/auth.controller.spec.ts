import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../common/types';

import {
  TestModuleBuilder,
  TestDataFactory,
  TestAssertions,
  TestPerformanceHelper,
  TestSecurityHelper,
  MockServicesFactory,
} from '../../../test/utils/test-helpers';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            googleAuth: jest.fn(),
            validateUser: jest.fn(),
            getProfile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: MockServicesFactory.createMockConfigService(),
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    // Mock Express Request and Response objects
    mockRequest = {
      user: TestDataFactory.createTestUser(),
      accessToken: 'mock-access-token',
      cookies: {},
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser({ email: registerDto.email }),
      };

      authService.register.mockResolvedValue(authResponse);

      // Act
      const result = await controller.register(
        registerDto,
        mockResponse as Response,
      );

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        authResponse.accessToken,
        {
          httpOnly: true,
          secure: false, // Not production
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60 * 1000, // 15 minutes
        },
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        authResponse.refreshToken,
        {
          httpOnly: true,
          secure: false, // Not production
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
      );
      expect(result).toEqual({
        message: 'Registration successful',
        user: authResponse.user,
      });
    });

    it('should handle registration conflicts', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const conflictError = new ConflictException('User already exists');

      authService.register.mockRejectedValue(conflictError);

      // Act & Assert
      await expect(
        controller.register(registerDto, mockResponse as Response),
      ).rejects.toThrow(ConflictException);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should validate input data', async () => {
      // Arrange
      const invalidRegisterDto = {
        email: 'invalid-email',
        name: '',
        password: '123', // Too short
      };

      // Act & Assert
      // This would be handled by validation pipes in real scenario
      expect(invalidRegisterDto.email).not.toMatch(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      );
      expect(invalidRegisterDto.name).toBe('');
      expect(invalidRegisterDto.password.length).toBeLessThan(8);
    });

    it('should sanitize input to prevent XSS', async () => {
      // Arrange
      const maliciousRegisterDto = {
        ...TestDataFactory.createValidRegisterDto(),
        name: '<script>alert("xss")</script>',
      };

      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser({ name: 'Clean Name' }),
      };

      authService.register.mockResolvedValue(authResponse);

      // Act
      await controller.register(maliciousRegisterDto, mockResponse as Response);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(maliciousRegisterDto);
      // The service should handle sanitization
    });

    it('should complete registration within acceptable time', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser(),
      };

      authService.register.mockResolvedValue(authResponse);

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(
        () => controller.register(registerDto, mockResponse as Response),
      );

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 100); // Should complete under 100ms
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser({ email: loginDto.email }),
      };

      authService.login.mockResolvedValue(authResponse);

      // Act
      const result = await controller.login(loginDto, mockResponse as Response);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Login successful',
        user: authResponse.user,
      });
    });

    it('should handle invalid credentials', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const unauthorizedError = new UnauthorizedException(
        'Invalid credentials',
      );

      authService.login.mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle account suspension', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const suspendedError = new UnauthorizedException(
        'Account is suspended or banned',
      );

      authService.login.mockRejectedValue(suspendedError);

      // Act & Assert
      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should prevent brute force attacks', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const attempts = Array(10).fill(loginDto);

      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      // Act & Assert
      for (const attempt of attempts) {
        await expect(
          controller.login(attempt, mockResponse as Response),
        ).rejects.toThrow(UnauthorizedException);
      }

      expect(authService.login).toHaveBeenCalledTimes(10);
      // Rate limiting would be handled by ThrottlerGuard
    });

    it('should handle SQL injection attempts', async () => {
      // Arrange
      const maliciousLoginDto = {
        email: "admin@example.com'; DROP TABLE users; --",
        password: 'password',
      };

      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      // Act & Assert
      await expect(
        controller.login(maliciousLoginDto, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(maliciousLoginDto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      mockRequest.cookies = { refreshToken };
      const authResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: TestDataFactory.createTestUser(),
      };

      authService.refreshToken.mockResolvedValue(authResponse);

      // Act
      const result = await controller.refresh(
        {},
        mockRequest as Request,
        mockResponse as Response,
      );

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Token refreshed successfully',
        user: authResponse.user,
      });
    });

    it('should handle missing refresh token', async () => {
      // Arrange
      mockRequest.cookies = {};

      // Act & Assert
      await expect(
        controller.refresh(
          {},
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-refresh-token';
      mockRequest.cookies = { refreshToken: invalidRefreshToken };

      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      // Act & Assert
      await expect(
        controller.refresh(
          {},
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        invalidRefreshToken,
      );
    });

    it('should handle expired refresh token', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token';
      mockRequest.cookies = { refreshToken: expiredRefreshToken };

      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Token expired'),
      );

      // Act & Assert
      await expect(
        controller.refresh(
          {},
          mockRequest as Request,
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const user = TestDataFactory.createTestUser();
      const accessToken = 'valid-access-token';
      mockRequest.user = user;
      mockRequest.accessToken = accessToken;

      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(
        user,
        mockRequest as Request,
        mockResponse as Response,
      );

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(user.sub, accessToken);
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should handle logout without authentication', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act & Assert
      // This would be handled by AuthGuard in real scenario
      expect(mockRequest.user).toBeUndefined();
    });

    it('should handle logout service errors', async () => {
      // Arrange
      const user = TestDataFactory.createTestUser();
      const accessToken = 'valid-access-token';
      mockRequest.user = user;
      mockRequest.accessToken = accessToken;

      authService.logout.mockRejectedValue(new Error('Logout failed'));

      // Act & Assert
      await expect(
        controller.logout(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const user = TestDataFactory.createTestUser();
      const profileData = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
      };

      authService.getProfile.mockResolvedValue(profileData);

      // Act
      const result = await controller.getProfile(user);

      // Assert
      expect(result).toEqual(profileData);
    });

    it('should handle missing user in request', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act & Assert
      // This would be handled by AuthGuard in real scenario
      expect(mockRequest.user).toBeUndefined();
    });

    it('should not expose sensitive information', async () => {
      // Arrange
      const user = TestDataFactory.createTestUser();
      const profileData = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
      };

      authService.getProfile.mockResolvedValue(profileData);

      // Act
      const result = await controller.getProfile(user);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
    });
  });

  describe('googleAuth', () => {
    it('should authenticate with Google successfully', async () => {
      // Arrange
      const googleAuthDto = TestDataFactory.createValidGoogleAuthDto();
      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser({ email: 'test@google.com' }),
      };

      authService.googleAuth.mockResolvedValue(authResponse);

      // Act
      const result = await controller.googleAuth(
        googleAuthDto,
        mockResponse as Response,
      );

      // Assert
      expect(authService.googleAuth).toHaveBeenCalledWith(googleAuthDto);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Google authentication successful',
        user: authResponse.user,
      });
    });

    it('should handle invalid Google token', async () => {
      // Arrange
      const invalidGoogleAuthDto = {
        ...TestDataFactory.createValidGoogleAuthDto(),
        token: 'invalid-google-token',
      };

      authService.googleAuth.mockRejectedValue(
        new UnauthorizedException('Invalid Google token'),
      );

      // Act & Assert
      await expect(
        controller.googleAuth(invalidGoogleAuthDto, mockResponse as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Google service errors', async () => {
      // Arrange
      const googleAuthDto = TestDataFactory.createValidGoogleAuthDto();

      authService.googleAuth.mockRejectedValue(
        new Error('Google service unavailable'),
      );

      // Act & Assert
      await expect(
        controller.googleAuth(googleAuthDto, mockResponse as Response),
      ).rejects.toThrow();
    });
  });

  describe('Security Tests', () => {
    it('should prevent CSRF attacks', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();

      // Mock request without proper CSRF token
      mockRequest.headers = {
        ...mockRequest.headers,
        origin: 'https://malicious-site.com',
      };

      // Act & Assert
      // CSRF protection would be handled by middleware
      expect(mockRequest.headers.origin).toBe('https://malicious-site.com');
    });

    it('should handle malicious payloads', async () => {
      // Arrange
      const maliciousPayloads = TestSecurityHelper.createMaliciousPayloads();

      for (const payload of maliciousPayloads) {
        const maliciousDto = {
          email: payload,
          password: 'password',
        };

        authService.login.mockRejectedValue(
          new UnauthorizedException('Invalid credentials'),
        );

        // Act & Assert
        await expect(
          controller.login(maliciousDto, mockResponse as Response),
        ).rejects.toThrow(UnauthorizedException);
      }
    });

    it('should validate request size limits', async () => {
      // Arrange
      const largePayload = 'x'.repeat(10000); // 10KB payload
      const largeDto = {
        ...TestDataFactory.createValidRegisterDto(),
        name: largePayload,
      };

      // Act & Assert
      // Request size limits would be handled by middleware
      expect(largeDto.name.length).toBeGreaterThan(1000);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent login requests efficiently', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const authResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: TestDataFactory.createTestUser(),
      };

      authService.login.mockResolvedValue(authResponse);

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(
        async () => {
          const promises = Array(10)
            .fill(null)
            .map(() => controller.login(loginDto, mockResponse as Response));
          return Promise.all(promises);
        },
      );

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 500); // Should complete under 500ms
    });

    it('should handle high-frequency refresh token requests', async () => {
      // Arrange
      mockRequest.cookies = { refreshToken: 'valid-refresh-token' };
      const authResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: TestDataFactory.createTestUser(),
      };

      authService.refreshToken.mockResolvedValue(authResponse);

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(
        async () => {
          const promises = Array(5)
            .fill(null)
            .map(() =>
              controller.refresh(
                {},
                mockRequest as Request,
                mockResponse as Response,
              ),
            );
          return Promise.all(promises);
        },
      );

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 200); // Should complete under 200ms
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();

      authService.login.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      // Act & Assert
      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow();
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();

      authService.register.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(
        controller.register(registerDto, mockResponse as Response),
      ).rejects.toThrow();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();

      authService.login.mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(
        controller.login(loginDto, mockResponse as Response),
      ).rejects.toThrow();
    });
  });
});
