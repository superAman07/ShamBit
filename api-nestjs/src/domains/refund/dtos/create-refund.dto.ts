import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  RefundType,
  RefundCategory,
  RefundReason,
  RefundReasonCode,
  ItemCondition,
} from '../enums/refund-status.enum';

export class CreateRefundItemDto {
  @IsString()
  orderItemId: string;

  @IsNumber()
  @Min(1)
  requestedQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(RefundReasonCode)
  reasonCode?: RefundReasonCode;

  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRefundDto {
  @IsString()
  orderId: string;

  @IsEnum(RefundType)
  refundType: RefundType;

  @IsOptional()
  @IsEnum(RefundCategory)
  refundCategory?: RefundCategory = RefundCategory.CUSTOMER_REQUEST;

  @IsEnum(RefundReason)
  reason: RefundReason;

  @IsOptional()
  @IsEnum(RefundReasonCode)
  reasonCode?: RefundReasonCode;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  merchantNotes?: string;

  // For partial refunds - specify amount
  @IsOptional()
  @IsNumber()
  @Min(1)
  requestedAmount?: number;

  // For item-level refunds - specify items
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundItemDto)
  items?: CreateRefundItemDto[];

  @IsOptional()
  @IsBoolean()
  restockRequired?: boolean = true;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateBulkRefundDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundDto)
  refunds: CreateRefundDto[];

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
