import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  GoogleAuthDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { AuthGuard } from '../../common/guards/auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; user: any }> {
    const result = await this.authService.register(registerDto);
    
    // Set secure cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Registration successful',
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; user: any }> {
    const result = await this.authService.login(loginDto);
    
    // Set secure cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Login successful',
      user: result.user,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth login' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; user: any }> {
    const result = await this.authService.googleAuth(googleAuthDto);
    
    // Set secure cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Google authentication successful',
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Body() refreshTokenDto: Partial<RefreshTokenDto>,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; user: any }> {
    // Priority: Cookie first, then body (for backward compatibility)
    const refreshToken = request.cookies?.refreshToken || refreshTokenDto.refreshToken;
    
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not provided in cookie or request body');
    }

    const result = await this.authService.refreshToken(refreshToken);
    
    // Set new secure cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Token refreshed successfully',
      user: result.user,
    };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: any,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    // Get access token from request (set by AuthGuard)
    const accessToken = (request as any).accessToken;
    
    await this.authService.logout(user.sub, accessToken);
    
    // Clear cookies
    this.clearAuthCookies(response);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  private setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'strict' as const,
      path: '/',
    };

    // Set access token cookie (15 minutes)
    response.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (7 days)
    response.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(response: Response): void {
    const cookieOptions = {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    response.clearCookie('accessToken', cookieOptions);
    response.clearCookie('refreshToken', cookieOptions);
  }
}