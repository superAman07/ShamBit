import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  sellerId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  periodStart?: Date;

  @IsOptional()
  @IsDate()
  periodEnd?: Date;

  @IsOptional()
  @IsDate()
  settlementDate?: Date;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsString()
  notes?: string;
}