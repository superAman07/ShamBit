import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundOrderItemDto {
  @ApiProperty({ description: 'Order item ID to refund' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ description: 'Quantity to refund' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Reason for refunding this item' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Condition of the item',
    enum: ['NEW', 'USED', 'DAMAGED', 'DEFECTIVE', 'MISSING']
  })
  @IsOptional()
  @IsEnum(['NEW', 'USED', 'DAMAGED', 'DEFECTIVE', 'MISSING'])
  condition?: string;
}

export class RefundOrderDto {
  @ApiProperty({ 
    description: 'Type of refund',
    enum: ['FULL', 'PARTIAL', 'ITEM_LEVEL']
  })
  @IsString()
  @IsEnum(['FULL', 'PARTIAL', 'ITEM_LEVEL'])
  refundType: string;

  @ApiProperty({ 
    description: 'Reason for refund',
    enum: [
      'CUSTOMER_REQUEST',
      'DEFECTIVE_PRODUCT',
      'WRONG_ITEM',
      'DAMAGED_IN_SHIPPING',
      'NOT_AS_DESCRIBED',
      'LATE_DELIVERY',
      'DUPLICATE_ORDER',
      'FRAUD',
      'OTHER'
    ]
  })
  @IsString()
  @IsEnum([
    'CUSTOMER_REQUEST',
    'DEFECTIVE_PRODUCT', 
    'WRONG_ITEM',
    'DAMAGED_IN_SHIPPING',
    'NOT_AS_DESCRIBED',
    'LATE_DELIVERY',
    'DUPLICATE_ORDER',
    'FRAUD',
    'OTHER'
  ])
  reason: string;

  @ApiPropertyOptional({ description: 'Detailed description of the refund reason' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Refund amount in cents (for partial refunds)',
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'Items to refund (for item-level refunds)',
    type: [RefundOrderItemDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundOrderItemDto)
  items?: RefundOrderItemDto[];

  @ApiPropertyOptional({ description: 'Customer notes about the refund' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Internal merchant notes' })
  @IsOptional()
  @IsString()
  merchantNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to restock returned items',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean = true;

  @ApiPropertyOptional({ 
    description: 'Whether this refund requires approval',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean = false;

  @ApiPropertyOptional({ description: 'Priority level for processing' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string = 'NORMAL';
}

export class ApproveRefundDto {
  @ApiProperty({ description: 'Whether to approve the refund' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Approved refund amount (if different from requested)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @ApiPropertyOptional({ description: 'Approval/rejection reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}