import { IsString, IsOptional, IsBoolean, IsArray, IsUrl, Length, Matches, IsObject, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BrandMetadata } from '../entities/brand.entity';
import { BrandScope } from '../enums/brand-scope.enum';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Brand name',
    example: 'Nike',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: 'Brand URL slug (auto-generated if not provided)',
    example: 'nike',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @Length(2, 100)
  @Transform(({ value }) => value?.toLowerCase())
  slug: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Leading athletic footwear and apparel brand',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Brand logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Brand website URL',
    example: 'https://nike.com',
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({
    description: 'Brand scope - visibility and access level',
    enum: BrandScope,
    example: BrandScope.SELLER_PRIVATE,
  })
  @IsEnum(BrandScope)
  scope: BrandScope = BrandScope.SELLER_PRIVATE;

  @ApiPropertyOptional({
    description: 'Whether this is a verified/official brand',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean = false;

  @ApiPropertyOptional({
    description: 'Brand owner ID (defaults to creator if not specified)',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  ownerId?: string;

  @ApiProperty({
    description: 'Array of category IDs this brand belongs to',
    example: ['cat_123', 'cat_456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  categoryIds: string[];

  @ApiPropertyOptional({
    description: 'Category IDs where this brand is allowed to be used',
    example: ['cat_123', 'cat_456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  allowedCategories?: string[];

  @ApiPropertyOptional({
    description: 'Category IDs where this brand is restricted from being used',
    example: ['cat_789'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  restrictedCategories?: string[];

  @ApiPropertyOptional({
    description: 'Additional brand metadata',
    example: {
      foundedYear: 1964,
      headquarters: 'Beaverton, Oregon',
      certifications: ['ISO 9001', 'Fair Trade'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: BrandMetadata;
}