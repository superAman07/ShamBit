import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({ 
    description: 'Reason for cancellation',
    enum: [
      'CUSTOMER_REQUEST',
      'OUT_OF_STOCK',
      'PAYMENT_FAILED',
      'FRAUD_DETECTED',
      'MERCHANT_CANCELLED',
      'SYSTEM_ERROR',
      'OTHER'
    ]
  })
  @IsString()
  @IsEnum([
    'CUSTOMER_REQUEST',
    'OUT_OF_STOCK', 
    'PAYMENT_FAILED',
    'FRAUD_DETECTED',
    'MERCHANT_CANCELLED',
    'SYSTEM_ERROR',
    'OTHER'
  ])
  reason: string;

  @ApiPropertyOptional({ description: 'Additional cancellation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to automatically refund if payment was processed',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  autoRefund?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Whether to restock inventory',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  restockInventory?: boolean = true;

  @ApiPropertyOptional({ description: 'Custom cancellation message for customer' })
  @IsOptional()
  @IsString()
  customerMessage?: string;
}

export class BulkCancelOrderDto {
  @ApiProperty({ description: 'Array of order IDs to cancel' })
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ description: 'Cancellation details' })
  cancellationData: Omit<CancelOrderDto, 'customerMessage'>;

  @ApiPropertyOptional({ description: 'Send notification to customers' })
  @IsOptional()
  @IsBoolean()
  notifyCustomers?: boolean = true;
}