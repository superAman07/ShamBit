import { IsString, IsOptional, IsObject, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RefundJobType } from '../enums/refund-status.enum';

export class CreateRefundJobDto {
  @IsString()
  type: RefundJobType;

  @IsOptional()
  @IsString()
  refundId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsObject()
  options?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @IsString()
  createdBy: string;
}