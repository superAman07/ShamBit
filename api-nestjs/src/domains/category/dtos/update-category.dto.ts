import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { CategoryStatus } from '../enums/category-status.enum';

export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['slug', 'parentId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Category status',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

export class CategoryStatusUpdateDto {
  @ApiPropertyOptional({
    description: 'New category status',
    enum: CategoryStatus,
    example: CategoryStatus.INACTIVE,
  })
  @IsEnum(CategoryStatus)
  status: CategoryStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'Category restructuring',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MoveCategoryDto {
  @ApiPropertyOptional({
    description: 'New parent category ID (null for root level)',
    example: 'cat_newparent123',
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @ApiPropertyOptional({
    description: 'Reason for moving the category',
    example: 'Reorganizing category structure',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
