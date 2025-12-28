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
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        password: true,
        roles: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
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
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
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