import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({ example: 'Customer requested cancellation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: { refundRequested: true } })
  @IsOptional()
  metadata?: Record<string, any>;
}
