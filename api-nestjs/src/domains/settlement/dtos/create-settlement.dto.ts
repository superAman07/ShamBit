import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty({ description: 'Seller unique identifier', example: 'seller_123' })
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ description: 'Seller account ID for payout', example: 'acc_456' })
  @IsString()
  @IsNotEmpty()
  sellerAccountId: string;

  @ApiProperty({ description: 'Settlement period start date', example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Settlement period end date', example: '2024-01-31T23:59:59Z' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ description: 'Total gross amount before deductions', example: 10000.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossAmount: number;

  @ApiProperty({ description: 'Commission amount to be deducted', example: 500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionAmount: number;

  @ApiPropertyOptional({ description: 'Platform fee amount', example: 100.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  platformFeeAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount (TDS/GST)', example: 90.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Any adjustment amount (positive or negative)', example: -10.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  adjustmentAmount?: number;

  @ApiProperty({ description: 'Final net amount to be paid to seller', example: 9310.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  netAmount: number;

  @ApiPropertyOptional({ description: 'Settlement currency', example: 'INR', default: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @ApiPropertyOptional({ description: 'Preferred settlement date', example: '2024-02-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  settlementDate?: string;

  @ApiPropertyOptional({ description: 'Scheduled processing date', example: '2024-02-01T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the settlement', example: 'Monthly settlement for January 2024' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', example: { source: 'auto', batch: 'monthly' } })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiProperty({ description: 'User ID who created the settlement', example: 'user_789' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class ProcessSettlementDto {
  @IsString()
  @IsNotEmpty()
  settlementId: string;

  @IsString()
  @IsNotEmpty()
  processedBy: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class CancelSettlementDto {
  @IsString()
  @IsNotEmpty()
  settlementId: string;

  @IsString()
  @IsNotEmpty()
  cancelledBy: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateSettlementDto {
  @IsDateString()
  @IsOptional()
  settlementDate?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;
}

export class ReconcileSettlementDto {
  @IsString()
  @IsNotEmpty()
  settlementId: string;

  @IsString()
  @IsNotEmpty()
  reconciledBy: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class RetrySettlementDto {
  @IsString()
  @IsNotEmpty()
  settlementId: string;

  @IsString()
  @IsNotEmpty()
  retriedBy: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class BulkSettlementDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sellerIds: string[];

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  batchSize?: number = 100;

  @IsString()
  @IsOptional()
  currency?: string = 'INR';

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}