import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettlementScheduleDto {
  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @IsOptional()
  @IsNumber()
  dayOfMonth?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  holdDays?: number;

  @IsOptional()
  @IsBoolean()
  autoSettle?: boolean;
}