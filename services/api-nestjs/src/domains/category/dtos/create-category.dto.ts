import { IsString, IsOptional, IsBoolean, IsArray, IsUrl, Length, IsEnum, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CategoryVisibility } from '../enums/category-visibility.enum';
import type { CategoryMetadata } from '../entities/category.entity';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: 'Category URL slug (auto-generated if not provided)',
    example: 'electronics',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Length(2, 100)
  @Transform(({ value }) => value?.toLowerCase())
  slug: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic devices and accessories',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: 'cat_parent123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  parentId?: string;

  @ApiProperty({
    description: 'Category visibility level',
    enum: CategoryVisibility,
    example: CategoryVisibility.PUBLIC,
  })
  @IsEnum(CategoryVisibility)
  visibility: CategoryVisibility = CategoryVisibility.PUBLIC;

  @ApiPropertyOptional({
    description: 'SEO title for search engines',
    example: 'Electronics - Best Deals on Electronic Devices',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO description for search engines',
    example: 'Shop the latest electronics including smartphones, laptops, and accessories at great prices.',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO keywords',
    example: ['electronics', 'gadgets', 'technology'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Category icon URL',
    example: 'https://example.com/icons/electronics.svg',
  })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Category banner URL',
    example: 'https://example.com/banners/electronics.jpg',
  })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order for sorting',
    example: 1,
    minimum: 0,
    maximum: 999999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999)
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Whether this category can contain products (leaf category)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isLeaf?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether this category is featured',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @ApiPropertyOptional({
    description: 'Brand IDs allowed in this category',
    example: ['brand_123', 'brand_456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  allowedBrands?: string[] = [];

  @ApiPropertyOptional({
    description: 'Brand IDs restricted from this category',
    example: ['brand_789'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  restrictedBrands?: string[] = [];

  @ApiPropertyOptional({
    description: 'Whether products in this category must have a brand',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresBrand?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional category metadata',
    example: {
      tags: ['popular', 'trending'],
      customFields: { priority: 'high' },
    },
  })
  @IsOptional()
  metadata?: CategoryMetadata;
}