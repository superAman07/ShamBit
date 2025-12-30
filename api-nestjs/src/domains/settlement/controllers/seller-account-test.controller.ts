import {
  Controller,
  Get,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth
} from '@nestjs/swagger';
import 'reflect-metadata';

import { SellerAccountRepository } from '../repositories/seller-account.repository';

import type {
  SellerAccountFilters,
  PaginationOptions,
  SellerAccountIncludeOptions,
} from '../interfaces/settlement-repository.interface';

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// Test guard that allows specific admin token for testing
@Injectable()
class TestAdminJwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const request = _context.switchToHttp().getRequest();
    
    // Check for Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }
    
    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Only allow specific test admin token
    if (token === 'test_admin_token_12345') {
      request.user = {
        id: 'admin_user_id',
        roles: ['ADMIN'],
        email: 'admin@example.com'
      };
      return true;
    }
    
    // Reject all other tokens
    throw new UnauthorizedException('Invalid or expired token');
  }
}

@Injectable()
class TestRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    // Get required roles from metadata (set by @Roles decorator)
    const requiredRoles = Reflect.getMetadata('roles', context.getHandler()) || [];
    
    if (requiredRoles.length === 0) {
      return true; // No specific roles required
    }
    
    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role: string) => user.roles?.includes(role));
    
    if (!hasRole) {
      throw new UnauthorizedException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }
    
    return true;
  }
}

const TestRoles = (...roles: string[]) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('roles', roles, descriptor.value);
    return descriptor;
  };
};

@ApiTags('Seller Accounts - Test')
@ApiBearerAuth()
@Controller('seller-accounts-test')
export class SellerAccountTestController {
  constructor(
    private readonly sellerAccountRepository: SellerAccountRepository,
  ) {}

  @Get('admin')
  @ApiOperation({ 
    summary: 'Get all seller accounts (Admin only) - TEST VERSION',
    description: 'Test version that accepts token "test_admin_token_12345" for testing security. Use Bearer test_admin_token_12345'
  })
  @ApiResponse({ status: 200, description: 'Seller accounts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @UseGuards(TestAdminJwtAuthGuard, TestRolesGuard)
  @TestRoles('ADMIN', 'FINANCE')
  async findAllAdmin(
    @Query() filters: SellerAccountFilters,
    @Query() includes: SellerAccountIncludeOptions,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    
    return this.sellerAccountRepository.findAll(filters, pagination, undefined, includes);
  }

  @Get('public-test')
  @ApiOperation({ 
    summary: 'Test public endpoint (no auth required)',
    description: 'This endpoint should work without authentication for comparison'
  })
  @ApiResponse({ status: 200, description: 'Public test successful' })
  async publicTest() {
    return {
      message: 'This is a public endpoint - no authentication required',
      timestamp: new Date().toISOString(),
      status: 'success'
    };
  }
}