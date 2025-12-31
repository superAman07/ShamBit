import { IsString, IsOptional, IsObject } from 'class-validator';

export class ProcessRefundDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  gatewayProvider?: string;
}
