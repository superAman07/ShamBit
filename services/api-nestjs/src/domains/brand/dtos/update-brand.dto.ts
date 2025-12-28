import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto';
import { BrandStatus } from '../enums/brand-status.enum';

export class UpdateBrandDto extends PartialType(
  OmitType(CreateBrandDto, ['slug'] as const)
) {
  @ApiPropertyOptional({
    description: 'Brand status',
    enum: BrandStatus,
    example: BrandStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(BrandStatus)
  status?: BrandStatus;
}

export class BrandStatusUpdateDto {
  @ApiPropertyOptional({
    description: 'New brand status',
    enum: BrandStatus,
    example: BrandStatus.INACTIVE,
  })
  @IsEnum(BrandStatus)
  status: BrandStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Brand requested deactivation',
  })
  @IsOptional()
  reason?: string;
}