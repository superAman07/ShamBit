import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto, GoogleAuthDto, AuthResponseDto } from './dto/auth.dto';
import { UserRole } from '../../common/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.authRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    
    const user = await this.authRepository.create({
      ...registerDto,
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

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended or banned');
    }

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

  async googleAuth(googleAuthDto: GoogleAuthDto): Promise<AuthResponseDto> {
    // TODO: Implement Google token verification
    // For now, this is a placeholder
    throw new BadRequestException('Google auth not implemented yet');
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const storedToken = await this.authRepository.getRefreshToken(user.id);
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

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
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.removeRefreshToken(userId);
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

  private async generateTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };

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