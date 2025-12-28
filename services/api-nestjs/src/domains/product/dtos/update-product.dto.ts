import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length, IsDateString, IsUUID } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['categoryId', 'brandId'] as const)
) {
  // Note: categoryId and brandId are omitted because changing them requires special validation
  // They can be changed through separate endpoints with proper validation
}

export class ProductStatusUpdateDto {
  @ApiPropertyOptional({ 
    enum: ProductStatus,
    example: ProductStatus.PUBLISHED,
    description: 'New status for the product'
  })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiPropertyOptional({ 
    example: 'Publishing product after final review',
    description: 'Reason for status change'
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;

  @ApiPropertyOptional({ 
    example: '2024-12-31T23:59:59Z',
    description: 'Schedule status change for future date'
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ProductModerationDto {
  @ApiPropertyOptional({ 
    enum: ProductModerationStatus,
    example: ProductModerationStatus.APPROVED,
    description: 'New moderation status'
  })
  @IsEnum(ProductModerationStatus)
  moderationStatus: ProductModerationStatus;

  @ApiPropertyOptional({ 
    example: 'Product meets all quality standards and guidelines',
    description: 'Moderation notes'
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  moderationNotes?: string;
}

export class ProductCategoryUpdateDto {
  @ApiPropertyOptional({ 
    example: 'cat_456',
    description: 'New category ID'
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ 
    example: 'Moving to more appropriate category',
    description: 'Reason for category change'
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to inherit attributes from new category'
  })
  @IsOptional()
  inheritAttributes?: boolean;
}

export class ProductBrandUpdateDto {
  @ApiPropertyOptional({ 
    example: 'brand_456',
    description: 'New brand ID'
  })
  @IsUUID()
  brandId: string;

  @ApiPropertyOptional({ 
    example: 'Correcting brand assignment',
    description: 'Reason for brand change'
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class BulkProductUpdateDto {
  @ApiPropertyOptional({ 
    type: [String],
    example: ['prod_123', 'prod_456'],
    description: 'Array of product IDs to update'
  })
  productIds: string[];

  @ApiPropertyOptional({ 
    enum: ProductStatus,
    example: ProductStatus.PUBLISHED,
    description: 'New status for all products'
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ 
    example: ['featured', 'sale'],
    description: 'Tags to add to all products'
  })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to feature all products'
  })
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ 
    example: 'Bulk update for holiday promotion',
    description: 'Reason for bulk update'
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class ProductCloneDto {
  @ApiPropertyOptional({ 
    example: 'iPhone 15 Pro - Copy',
    description: 'Name for the cloned product'
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ 
    example: 'iphone-15-pro-copy',
    description: 'Slug for the cloned product'
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to copy attribute values'
  })
  @IsOptional()
  copyAttributeValues?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to copy media files'
  })
  @IsOptional()
  copyMedia?: boolean;
}