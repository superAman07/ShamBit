import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundOrderItemDto {
  @ApiProperty({ example: 'item_123' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Defective product' })
  @IsString()
  reason: string;
}

export class RefundOrderDto {
  @ApiProperty({ example: 59.98 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Customer not satisfied with product quality' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ type: [RefundOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundOrderItemDto)
  items?: RefundOrderItemDto[];

  @ApiPropertyOptional({ example: { customerInitiated: true } })
  @IsOptional()
  metadata?: Record<string, any>;
}