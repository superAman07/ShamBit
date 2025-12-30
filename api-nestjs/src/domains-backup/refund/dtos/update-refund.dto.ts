import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RefundReason, RefundReasonCode, ItemCondition } from '../enums/refund-status.enum';

export class UpdateRefundItemDto {
  @IsString()
  refundItemId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  approvedQuantity?: number;

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

export class UpdateRefundDto {
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

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

  @IsOptional()
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRefundItemDto)
  items?: UpdateRefundItemDto[];

  @IsOptional()
  @IsBoolean()
  restockRequired?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ApproveRefundDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRefundItemDto)
  items?: UpdateRefundItemDto[];

  @IsOptional()
  @IsBoolean()
  restockRequired?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class RejectRefundDto {
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  rejectionNotes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessRefundDto {
  @IsOptional()
  @IsString()
  processingNotes?: string;

  @IsOptional()
  @IsBoolean()
  forceProcess?: boolean = false;

  @IsOptional()
  metadata?: Record<string, any>;
}