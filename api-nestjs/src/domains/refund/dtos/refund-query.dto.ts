import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  RefundStatus,
  RefundType,
  RefundCategory,
  RefundReason,
} from '../enums/refund-status.enum';

export class RefundQueryDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(RefundStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  statuses?: RefundStatus[];

  @IsOptional()
  @IsEnum(RefundType)
  refundType?: RefundType;

  @IsOptional()
  @IsEnum(RefundCategory)
  refundCategory?: RefundCategory;

  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @IsOptional()
  @IsString()
  gatewayRefundId?: string;

  @IsOptional()
  @IsString()
  refundNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsDateString()
  processedAfter?: string;

  @IsOptional()
  @IsDateString()
  processedBefore?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search in refund number, description, notes

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  // Pagination
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  cursor?: string;

  // Sorting
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Include related data
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeOrder?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeItems?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeLedger?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAuditLogs?: boolean = false;
}

export class RefundStatsQueryDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  groupBy?: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';

  @IsOptional()
  @IsArray()
  @IsEnum(RefundStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  statuses?: RefundStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(RefundReason, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  reasons?: RefundReason[];
}
