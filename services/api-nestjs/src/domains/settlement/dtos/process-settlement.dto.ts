import { IsString, IsOptional } from 'class-validator';

export class ProcessSettlementDto {
  @IsString()
  settlementId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: any;
}