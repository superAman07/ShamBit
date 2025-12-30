import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum SettlementJobType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MANUAL = 'MANUAL',
}

export class CreateSettlementJobDto {
  @IsEnum(SettlementJobType)
  type: SettlementJobType;

  @IsString()
  merchantId: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}