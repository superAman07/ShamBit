import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        userTenants: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userTenants: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  async create(userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    roles: string[];
    isEmailVerified: boolean;
  }) {
    return this.prisma.user.create({
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
  }

  async findByRefreshToken(refreshToken: string) {
    // Find which user this token belongs to by searching Redis keys
    try {
      const keys = await this.redis.keys('refresh_token:*');

      for (const key of keys) {
        const storedToken = await this.redis.get(key);
        if (storedToken === refreshToken) {
          const userId = key.replace('refresh_token:', '');
          return this.findById(userId);
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateUser(userId: string, updateData: any) {
    return this.prisma.user.update({
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
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redis.set(key, refreshToken, 7 * 24 * 60 * 60); // 7 days
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return this.redis.get(key);
  }

  async removeRefreshToken(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redis.del(key);
  }
}
