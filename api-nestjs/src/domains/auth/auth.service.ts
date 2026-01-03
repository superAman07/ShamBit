import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { AuthRepository } from './auth.repository';
import {
  LoginDto,
  RegisterDto,
  GoogleAuthDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { UserRole } from '../../common/types';
import { TokenDenylistService } from '../../infrastructure/security/token-denylist.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenDenylistService: TokenDenylistService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.authRepository.findByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Basic input sanitization
    const sanitizedName = registerDto.name.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    const user = await this.authRepository.create({
      ...registerDto,
      name: sanitizedName,
      password: hashedPassword,
      roles: [UserRole.BUYER],
      isEmailVerified: false,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.authRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);
    await this.authRepository.updateLastLogin(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto): Promise<AuthResponseDto> {
    // For testing purposes, we'll implement a basic version
    // In production, you would verify the Google token here
    
    // Mock Google token verification - in real implementation, verify with Google
    if (!googleAuthDto.googleToken) {
      throw new BadRequestException('Invalid Google token');
    }
    
    // Mock user data from Google token (in real implementation, extract from verified token)
    const mockGoogleUser = {
      email: 'test@google.com',
      name: 'Google Test User',
    };
    
    let user = await this.authRepository.findByEmail(mockGoogleUser.email);
    
    if (!user) {
      // Create new user from Google data
      user = await this.authRepository.create({
        name: mockGoogleUser.name,
        email: mockGoogleUser.email,
        password: await bcrypt.hash(Math.random().toString(36), 12), // Random password for OAuth users
        roles: [UserRole.BUYER],
        isEmailVerified: true, // Google emails are pre-verified
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);
    await this.authRepository.updateLastLogin(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.authRepository.findByRefreshToken(refreshToken);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens (refresh token rotation)
      const tokens = await this.generateTokens(user.id, user.email, user.roles);

      // Save new refresh token and invalidate old one
      await this.authRepository.saveRefreshToken(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken?: string): Promise<void> {
    // Remove refresh token from storage
    await this.authRepository.removeRefreshToken(userId);

    // Add access token to denylist if provided
    if (accessToken) {
      await this.tokenDenylistService.denyToken(accessToken);
    }
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return null;
    }

    // Return user without password
    const { password: _, ...result } = user;
    return result;
  }

  async generateTokens(userId: string, email: string, roles: string[]) {
    const jti = uuidv4(); // JWT ID for tracking
    const payload = { sub: userId, email, roles, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
