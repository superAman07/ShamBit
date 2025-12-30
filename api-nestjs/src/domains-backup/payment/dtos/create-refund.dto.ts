import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ description: 'Payment Intent ID to refund' })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ description: 'Transaction ID to refund' })
  @IsString()
  transactionId: string;

  @ApiProperty({ 
    description: 'Refund amount in cents',
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ 
    description: 'Reason for the refund',
    enum: [
      'DUPLICATE',
      'FRAUDULENT', 
      'REQUESTED_BY_CUSTOMER',
      'DEFECTIVE_PRODUCT',
      'WRONG_ITEM',
      'DAMAGED_IN_SHIPPING',
      'NOT_AS_DESCRIBED',
      'LATE_DELIVERY',
      'MERCHANT_ERROR',
      'SYSTEM_ERROR',
      'OTHER'
    ]
  })
  @IsString()
  @IsEnum([
    'DUPLICATE',
    'FRAUDULENT',
    'REQUESTED_BY_CUSTOMER', 
    'DEFECTIVE_PRODUCT',
    'WRONG_ITEM',
    'DAMAGED_IN_SHIPPING',
    'NOT_AS_DESCRIBED',
    'LATE_DELIVERY',
    'MERCHANT_ERROR',
    'SYSTEM_ERROR',
    'OTHER'
  ])
  reason: string;

  @ApiPropertyOptional({ description: 'Detailed description of the refund reason' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Currency code (defaults to original transaction currency)',
    example: 'USD'
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to reverse any application fees',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  reverseApplicationFee?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Whether to refund shipping costs',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  refundShipping?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Instructions for the refund (for manual processing)'
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the refund' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Notification preferences for the refund'
  })
  @IsOptional()
  notifications?: {
    email?: boolean;
    sms?: boolean;
    webhook?: boolean;
  };

  @ApiPropertyOptional({ 
    description: 'Expected processing time',
    enum: ['IMMEDIATE', 'STANDARD', 'EXPEDITED']
  })
  @IsOptional()
  @IsEnum(['IMMEDIATE', 'STANDARD', 'EXPEDITED'])
  processingSpeed?: string = 'STANDARD';
}

export class BulkRefundDto {
  @ApiProperty({ description: 'Array of transaction IDs to refund' })
  @IsString({ each: true })
  transactionIds: string[];

  @ApiProperty({ description: 'Refund details to apply to all transactions' })
  refundData: Omit<CreateRefundDto, 'transactionId'>;

  @ApiPropertyOptional({ 
    description: 'Whether to continue processing if some refunds fail',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;
}