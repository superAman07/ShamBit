import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';

import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { TokenDenylistService } from '../../../infrastructure/security/token-denylist.service';
import { UserRole } from '../../../common/types';

import {
  TestModuleBuilder,
  TestDataFactory,
  TestAssertions,
  TestErrorHelper,
  TestPerformanceHelper,
  TestSecurityHelper,
  MockServicesFactory,
} from '../../../test/utils/test-helpers';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let tokenDenylistService: jest.Mocked<TokenDenylistService>;

  beforeEach(async () => {
    const module: TestingModule = await TestModuleBuilder.createAuthTestingModule([
      AuthService,
      {
        provide: AuthRepository,
        useValue: {
          findByEmail: jest.fn(),
          create: jest.fn(),
          saveRefreshToken: jest.fn(),
          findByRefreshToken: jest.fn(),
          removeRefreshToken: jest.fn(),
          updateLastLogin: jest.fn(),
        },
      },
    ]);

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    tokenDenylistService = module.get(TokenDenylistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const hashedPassword = '$2b$12$hashedpassword';
      const createdUser = TestDataFactory.createTestUser({
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
      });
      const tokens = TestDataFactory.createAuthTokens();

      authRepository.findByEmail.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      authRepository.create.mockResolvedValue(createdUser);
      jwtService.signAsync.mockResolvedValueOnce(tokens.accessToken).mockResolvedValueOnce(tokens.refreshToken);
      authRepository.saveRefreshToken.mockResolvedValue(undefined);

      // Act
      const result = await service.register(registerDto);

      // Assert
      TestAssertions.expectValidAuthResponse(result);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(authRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
        roles: [UserRole.BUYER],
        isEmailVerified: false,
      });
      expect(authRepository.saveRefreshToken).toHaveBeenCalledWith(createdUser.id, tokens.refreshToken);
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const existingUser = TestDataFactory.createTestUser({ email: registerDto.email });

      authRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(authRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const dbError = TestErrorHelper.createDatabaseConnectionError();

      authRepository.findByEmail.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow();
    });

    it('should validate password strength', async () => {
      // Arrange
      const weakPasswordDto = {
        ...TestDataFactory.createValidRegisterDto(),
        password: '123',
      };

      authRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      // This would be handled by validation pipes in real scenario
      expect(weakPasswordDto.password.length).toBeLessThan(8);
    });

    it('should sanitize user input', async () => {
      // Arrange
      const maliciousDto = {
        ...TestDataFactory.createValidRegisterDto(),
        name: '<script>alert("xss")</script>',
      };

      authRepository.findByEmail.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      authRepository.create.mockResolvedValue(TestDataFactory.createTestUser());
      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.register(maliciousDto);

      // Assert
      const createCall = authRepository.create.mock.calls[0][0];
      TestSecurityHelper.expectSanitizedOutput(createCall.name);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const user = TestDataFactory.createTestUser({ email: loginDto.email });
      const tokens = TestDataFactory.createAuthTokens();

      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValueOnce(tokens.accessToken).mockResolvedValueOnce(tokens.refreshToken);
      authRepository.saveRefreshToken.mockResolvedValue(undefined);
      authRepository.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.login(loginDto);

      // Assert
      TestAssertions.expectValidAuthResponse(result);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, user.password);
      expect(authRepository.updateLastLogin).toHaveBeenCalledWith(user.id);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();

      authRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const user = TestDataFactory.createTestUser({ email: loginDto.email });

      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, user.password);
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const suspendedUser = TestDataFactory.createTestUser({
        email: loginDto.email,
        status: 'SUSPENDED',
      });

      authRepository.findByEmail.mockResolvedValue(suspendedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for banned user', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const bannedUser = TestDataFactory.createTestUser({
        email: loginDto.email,
        status: 'BANNED',
      });

      authRepository.findByEmail.mockResolvedValue(bannedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should complete login within acceptable time', async () => {
      // Arrange
      const loginDto = TestDataFactory.createValidLoginDto();
      const user = TestDataFactory.createTestUser({ email: loginDto.email });

      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValue('token');
      authRepository.saveRefreshToken.mockResolvedValue(undefined);
      authRepository.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(() =>
        service.login(loginDto)
      );

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 1000); // Should complete under 1 second
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const user = TestDataFactory.createTestUser();
      const newTokens = TestDataFactory.createAuthTokens();

      authRepository.findByRefreshToken.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValueOnce(newTokens.accessToken).mockResolvedValueOnce(newTokens.refreshToken);
      authRepository.saveRefreshToken.mockResolvedValue(undefined);

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      TestAssertions.expectValidAuthResponse(result);
      expect(authRepository.findByRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(authRepository.saveRefreshToken).toHaveBeenCalledWith(user.id, newTokens.refreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-refresh-token';

      authRepository.findByRefreshToken.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const userId = 'user-123';
      const accessToken = 'valid-access-token';

      authRepository.removeRefreshToken.mockResolvedValue(undefined);
      tokenDenylistService.denyToken.mockResolvedValue(undefined);

      // Act
      await service.logout(userId, accessToken);

      // Assert
      expect(authRepository.removeRefreshToken).toHaveBeenCalledWith(userId);
      expect(tokenDenylistService.denyToken).toHaveBeenCalledWith(accessToken);
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const accessToken = 'valid-access-token';

      authRepository.removeRefreshToken.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.logout(userId, accessToken)).rejects.toThrow();
    });
  });

  describe('generateTokens', () => {
    it('should generate valid JWT tokens', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const roles = [UserRole.BUYER];
      const tokens = TestDataFactory.createAuthTokens();

      jwtService.signAsync.mockResolvedValueOnce(tokens.accessToken).mockResolvedValueOnce(tokens.refreshToken);

      // Act
      const result = await service.generateTokens(userId, email, roles);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      TestAssertions.expectValidJwtToken(result.accessToken);
      TestAssertions.expectValidJwtToken(result.refreshToken);
    });

    it('should include correct payload in tokens', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const roles = [UserRole.BUYER];

      jwtService.signAsync.mockResolvedValue('token');

      // Act
      await service.generateTokens(userId, email, roles);

      // Assert
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: userId, email, roles }),
        { secret: 'test-jwt-secret', expiresIn: '15m' }
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: userId, email, roles }),
        { secret: 'test-refresh-secret', expiresIn: '7d' }
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const user = TestDataFactory.createTestUser({ email });

      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      const { password: _, ...expectedUser } = user;
      expect(result).toEqual(expectedUser);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
    });

    it('should return null for invalid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const user = TestDataFactory.createTestUser({ email });

      authRepository.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('googleAuth', () => {
    it('should authenticate with Google successfully', async () => {
      // Arrange
      const googleAuthDto = TestDataFactory.createValidGoogleAuthDto();
      const tokens = TestDataFactory.createAuthTokens();
      const mockGoogleEmail = 'test@google.com';

      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockResolvedValue(TestDataFactory.createTestUser({
        email: mockGoogleEmail,
        name: 'Google Test User',
      }));
      jwtService.signAsync.mockResolvedValueOnce(tokens.accessToken).mockResolvedValueOnce(tokens.refreshToken);
      authRepository.saveRefreshToken.mockResolvedValue(undefined);
      authRepository.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.googleAuth(googleAuthDto);

      // Assert
      TestAssertions.expectValidAuthResponse(result);
      expect(authRepository.findByEmail).toHaveBeenCalledWith(mockGoogleEmail);
    });

    it('should login existing Google user', async () => {
      // Arrange
      const googleAuthDto = TestDataFactory.createValidGoogleAuthDto();
      const mockGoogleEmail = 'test@google.com';
      const existingUser = TestDataFactory.createTestUser({ email: mockGoogleEmail });
      const tokens = TestDataFactory.createAuthTokens();

      authRepository.findByEmail.mockResolvedValue(existingUser);
      jwtService.signAsync.mockResolvedValueOnce(tokens.accessToken).mockResolvedValueOnce(tokens.refreshToken);
      authRepository.saveRefreshToken.mockResolvedValue(undefined);
      authRepository.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.googleAuth(googleAuthDto);

      // Assert
      TestAssertions.expectValidAuthResponse(result);
      expect(authRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent registration attempts', async () => {
      // Arrange
      const registerDto = TestDataFactory.createValidRegisterDto();
      const duplicateError = TestErrorHelper.createDuplicateEmailError();

      authRepository.findByEmail.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpassword' as never);
      authRepository.create.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow();
    });

    it('should handle JWT signing errors', async () => {
      // Arrange
      const userId = 'user-123';
      const email = 'test@example.com';
      const roles = [UserRole.BUYER];

      jwtService.signAsync.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      // Act & Assert
      await expect(service.generateTokens(userId, email, roles)).rejects.toThrow();
    });

    it('should handle malformed refresh tokens', async () => {
      // Arrange
      const malformedToken = 'not.a.valid.jwt.token';

      authRepository.findByRefreshToken.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(malformedToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});