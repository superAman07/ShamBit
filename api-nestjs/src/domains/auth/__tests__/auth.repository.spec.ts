import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { AuthRepository } from '../auth.repository';
import { UserRole } from '../../../common/types';

import {
  TestModuleBuilder,
  TestDataFactory,
  TestDatabaseHelper,
  TestErrorHelper,
  TestPerformanceHelper,
  MockServicesFactory,
} from '../../../test/utils/test-helpers';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await TestModuleBuilder.createAuthTestingModule([
      AuthRepository,
    ]);

    repository = module.get<AuthRepository>(AuthRepository);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const expectedUser = TestDataFactory.createTestUser({ email });

      prismaService.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await repository.findByEmail(email);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail(email);

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const email = 'test@example.com';
      const dbError = TestErrorHelper.createDatabaseConnectionError();

      prismaService.user.findUnique.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findByEmail(email)).rejects.toThrow();
    });

    it('should complete query within acceptable time', async () => {
      // Arrange
      const email = 'test@example.com';
      const user = TestDataFactory.createTestUser({ email });

      prismaService.user.findUnique.mockResolvedValue(user);

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(() =>
        repository.findByEmail(email)
      );

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 100); // Should complete under 100ms
    });

    it('should handle special characters in email', async () => {
      // Arrange
      const specialEmail = 'test+special@example.com';
      const user = TestDataFactory.createTestUser({ email: specialEmail });

      prismaService.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await repository.findByEmail(specialEmail);

      // Assert
      expect(result).toEqual(user);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: specialEmail },
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'hashedpassword',
        roles: [UserRole.BUYER],
        isEmailVerified: false,
      };
      const createdUser = TestDataFactory.createTestUser(userData);

      prismaService.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          status: 'ACTIVE',
        },
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });

    it('should handle duplicate email error', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'hashedpassword',
        roles: [UserRole.BUYER],
        isEmailVerified: false,
      };
      const duplicateError = TestErrorHelper.createDuplicateEmailError();

      prismaService.user.create.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(repository.create(userData)).rejects.toThrow();
    });

    it('should create user with multiple roles', async () => {
      // Arrange
      const userData = {
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'hashedpassword',
        roles: [UserRole.ADMIN, UserRole.SELLER],
        isEmailVerified: true,
      };
      const createdUser = TestDataFactory.createTestUser(userData);

      prismaService.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(result.roles).toContain(UserRole.ADMIN);
      expect(result.roles).toContain(UserRole.SELLER);
    });

    it('should create user with optional fields', async () => {
      // Arrange
      const userData = {
        email: 'user@example.com',
        name: 'User',
        phone: '+1234567890',
        password: 'hashedpassword',
        roles: [UserRole.BUYER],
        isEmailVerified: false,
      };
      const createdUser = TestDataFactory.createTestUser(userData);

      prismaService.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await repository.create(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(result.phone).toBe(userData.phone);
    });
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token to Redis successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';
      const expectedKey = `refresh_token:${userId}`;
      const expectedTTL = 7 * 24 * 60 * 60; // 7 days in seconds

      redisService.set.mockResolvedValue('OK');

      // Act
      await repository.saveRefreshToken(userId, refreshToken);

      // Assert
      expect(redisService.set).toHaveBeenCalledWith(expectedKey, refreshToken, expectedTTL);
    });

    it('should handle Redis connection errors', async () => {
      // Arrange
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';

      redisService.set.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(repository.saveRefreshToken(userId, refreshToken)).rejects.toThrow();
    });

    it('should overwrite existing refresh token', async () => {
      // Arrange
      const userId = 'user-123';
      const oldRefreshToken = 'old-refresh-token';
      const newRefreshToken = 'new-refresh-token';
      const expectedKey = `refresh_token:${userId}`;

      redisService.set.mockResolvedValue('OK');

      // Act
      await repository.saveRefreshToken(userId, oldRefreshToken);
      await repository.saveRefreshToken(userId, newRefreshToken);

      // Assert
      expect(redisService.set).toHaveBeenCalledTimes(2);
      expect(redisService.set).toHaveBeenLastCalledWith(expectedKey, newRefreshToken, expect.any(Number));
    });
  });

  describe('findByRefreshToken', () => {
    it('should find user by refresh token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-123';
      const user = TestDataFactory.createTestUser({ id: userId });
      const expectedKey = `refresh_token:${userId}`;

      // Mock Redis keys and get methods
      redisService.keys.mockResolvedValue([expectedKey]);
      redisService.get.mockResolvedValue(refreshToken);
      prismaService.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await repository.findByRefreshToken(refreshToken);

      // Assert
      expect(result).toEqual(user);
      expect(redisService.keys).toHaveBeenCalledWith('refresh_token:*');
      expect(redisService.get).toHaveBeenCalledWith(expectedKey);
    });

    it('should return null for invalid refresh token', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-refresh-token';

      redisService.get.mockResolvedValue(null);

      // Act
      const result = await repository.findByRefreshToken(invalidRefreshToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token';

      redisService.get.mockResolvedValue(null);

      // Act
      const result = await repository.findByRefreshToken(expiredRefreshToken);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('removeRefreshToken', () => {
    it('should remove refresh token successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedKey = `refresh_token:${userId}`;

      redisService.del.mockResolvedValue(1);

      // Act
      await repository.removeRefreshToken(userId);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(expectedKey);
    });

    it('should handle removal of non-existent token', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedKey = `refresh_token:${userId}`;

      redisService.del.mockResolvedValue(0); // Key didn't exist

      // Act
      await repository.removeRefreshToken(userId);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith(expectedKey);
    });

    it('should handle Redis errors during removal', async () => {
      // Arrange
      const userId = 'user-123';

      redisService.del.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(repository.removeRefreshToken(userId)).rejects.toThrow();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const updatedUser = TestDataFactory.createTestUser({
        id: userId,
        lastLoginAt: new Date(),
      });

      prismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      await repository.updateLastLogin(userId);

      // Assert
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should handle update errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const notFoundError = TestErrorHelper.createNotFoundError();

      prismaService.user.update.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(repository.updateLastLogin(userId)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedUser = TestDataFactory.createTestUser({ id: userId });

      prismaService.user.findUnique.mockResolvedValue(expectedUser);

      // Act
      const result = await repository.findById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });

    it('should return null when user not found by ID', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        isEmailVerified: true,
      };
      const updatedUser = TestDataFactory.createTestUser({
        id: userId,
        ...updateData,
      });

      prismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await repository.updateUser(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });

    it('should handle partial updates', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = { isEmailVerified: true };
      const updatedUser = TestDataFactory.createTestUser({
        id: userId,
        isEmailVerified: true,
      });

      prismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await repository.updateUser(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: {
          userTenants: {
            include: {
              tenant: true,
            },
          },
        },
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent read operations efficiently', async () => {
      // Arrange
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const users = emails.map(email => TestDataFactory.createTestUser({ email }));

      prismaService.user.findUnique.mockImplementation((args: any) => {
        const email = args.where.email;
        return Promise.resolve(users.find(u => u.email === email) || null);
      });

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(async () => {
        const promises = emails.map(email => repository.findByEmail(email));
        return Promise.all(promises);
      });

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 200); // Should complete under 200ms
    });

    it('should handle bulk refresh token operations efficiently', async () => {
      // Arrange
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
      const refreshTokens = userIds.map(id => `refresh-token-${id}`);

      redisService.set.mockResolvedValue('OK');

      // Act
      const { duration } = await TestPerformanceHelper.measureExecutionTime(async () => {
        const promises = userIds.map((userId, index) =>
          repository.saveRefreshToken(userId, refreshTokens[index])
        );
        return Promise.all(promises);
      });

      // Assert
      TestPerformanceHelper.expectExecutionTimeUnder(duration, 100); // Should complete under 100ms
      expect(redisService.set).toHaveBeenCalledTimes(5);
    });
  });
});