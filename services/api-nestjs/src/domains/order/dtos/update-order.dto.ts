import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Shipping method' })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ description: 'Order currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Order metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class OrderStatusUpdateDto {
  @ApiProperty({ 
    description: 'New order status',
    enum: OrderStatus
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderItemDto {
  @ApiProperty({ description: 'Order item ID' })
  @IsString()
  orderItemId: string;

  @ApiPropertyOptional({ description: 'Updated quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Updated unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class BulkUpdateOrderDto {
  @ApiProperty({ description: 'Array of order IDs to update' })
  @IsArray()
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ description: 'Status update data' })
  @ValidateNested()
  @Type(() => OrderStatusUpdateDto)
  statusUpdate: OrderStatusUpdateDto;
}