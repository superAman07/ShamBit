import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(AuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':variantId/:sellerId')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory for variant and seller' })
  async getInventory(
    @Param('variantId') variantId: string,
    @Param('sellerId') sellerId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    // Sellers can only access their own inventory
    if (!userRoles.includes(UserRole.ADMIN) && userId !== sellerId) {
      throw new Error('Access denied');
    }

    return this.inventoryService.findByVariant(variantId, sellerId);
  }

  @Put(':variantId/:sellerId/stock')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stock quantity' })
  async updateStock(
    @Param('variantId') variantId: string,
    @Param('sellerId') sellerId: string,
    @Body() body: { quantity: number; reason: string; referenceId?: string; referenceType?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('roles') userRoles: UserRole[],
  ) {
    // Sellers can only update their own inventory
    if (!userRoles.includes(UserRole.ADMIN) && userId !== sellerId) {
      throw new Error('Access denied');
    }

    const inventory = await this.inventoryService.findByVariant(variantId, sellerId);
    if (!inventory) {
      throw new Error('Inventory not found');
    }

    if (body.quantity > 0) {
      return this.inventoryService.increaseStock(inventory.id, {
        quantity: body.quantity,
        reason: body.reason,
        referenceId: body.referenceId,
        referenceType: body.referenceType,
      }, userId);
    }

    if (body.quantity < 0) {
      return this.inventoryService.decreaseStock(inventory.id, {
        quantity: Math.abs(body.quantity),
        reason: body.reason,
        referenceId: body.referenceId,
        referenceType: body.referenceType,
      }, userId);
    }

    return this.inventoryService.adjustStock(inventory.id, body.quantity, body.reason, userId);
  }

  @Post('reserve')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reserve stock for order' })
  async reserveStock(
    @Body() reservationDto: any,
    @CurrentUser('id') userId: string,
  ) {
    // reservationDto may contain either inventoryId or variantId/sellerId
    let inventoryId = reservationDto.inventoryId as string | undefined;
    if (!inventoryId && reservationDto.variantId && reservationDto.sellerId) {
      const inv = await this.inventoryService.findByVariant(reservationDto.variantId, reservationDto.sellerId);
      if (!inv) throw new Error('Inventory not found');
      inventoryId = inv.id;
    }

    if (!inventoryId) throw new Error('inventoryId is required');

    const reservationKey = reservationDto.reservationKey || undefined;

    return this.inventoryService.reserveStock(
      inventoryId,
      reservationDto.quantity,
      reservationKey,
      reservationDto.referenceType || 'ORDER',
      reservationDto.referenceId || reservationKey || '',
      new Date(reservationDto.expiresAt),
      userId,
      reservationDto.metadata,
    );
  }

  @Post('release/:reservationId')
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release stock reservation' })
  async releaseReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: { reason: string },
  ) {
    return this.inventoryService.releaseReservation(reservationId, body.reason);
  }

  @Post('confirm/:reservationId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm stock reservation (deduct stock)' })
  async confirmReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: { reason: string },
  ) {
    return this.inventoryService.commitReservation(reservationId, body.reason);
  }
}