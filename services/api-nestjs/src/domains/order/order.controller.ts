import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { OrderService, CreateOrderDto } from './order.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  async findByUser(
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') userRoles: UserRole[],
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // Admins can see all orders, buyers only their own
    if (userRoles.includes(UserRole.ADMIN)) {
      // For admin, you might want to implement a different endpoint
      // or add query parameters to filter by user
    }
    
    return this.orderService.findByUser(userId, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    const userRole = userRoles.includes(UserRole.ADMIN) ? UserRole.ADMIN : undefined;
    return this.orderService.findById(id, userId, userRole);
  }

  @Post()
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.createOrder(createOrderDto, userId);
  }

  @Post(':id/payment')
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process order payment' })
  async processPayment(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.processPayment(orderId, userId);
  }

  @Post(':id/confirm-payment')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm order payment' })
  async confirmPayment(
    @Param('id') orderId: string,
    @Body() body: { paymentId: string },
  ) {
    return this.orderService.confirmPayment(orderId, body.paymentId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order' })
  async cancel(
    @Param('id') orderId: string,
    @Body() body: { reason: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    const userRole = userRoles.includes(UserRole.ADMIN) ? UserRole.ADMIN : undefined;
    return this.orderService.cancelOrder(orderId, userId, body.reason, userRole);
  }
}