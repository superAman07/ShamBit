import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsUUID, IsInt, IsDateString, ValidateNested, IsObject, Length, Min, Max, ArrayMaxSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVisibility } from '../enums/product-visibility.enum';

export class CreateProductAttributeValueDto {
  @ApiProperty({ example: 'attr_123', description: 'Attribute ID' })
  @IsUUID()
  attributeId: string;

  @ApiProperty({ example: 'Red', description: 'Attribute value' })
  value: any;

  @ApiPropertyOptional({ example: 'en', description: 'Locale for localized attributes' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro', description: 'Product name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ example: 'iphone-15-pro', description: 'URL-friendly slug (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiPropertyOptional({ 
    example: 'The latest iPhone with advanced camera system and A17 Pro chip.',
    description: 'Detailed product description'
  })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @ApiPropertyOptional({ 
    example: 'Latest iPhone with advanced features',
    description: 'Short product description for listings'
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  shortDescription?: string;

  @ApiProperty({ example: 'cat_123', description: 'Category ID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'brand_123', description: 'Brand ID' })
  @IsUUID()
  brandId: string;

  @ApiPropertyOptional({ 
    enum: ProductVisibility,
    example: ProductVisibility.PRIVATE,
    description: 'Product visibility level'
  })
  @IsOptional()
  @IsEnum(ProductVisibility)
  visibility?: ProductVisibility;

  @ApiPropertyOptional({ 
    example: 'iPhone 15 Pro - Best Price',
    description: 'SEO title (max 60 characters)'
  })
  @IsOptional()
  @IsString()
  @Length(0, 60)
  seoTitle?: string;

  @ApiPropertyOptional({ 
    example: 'Buy the latest iPhone 15 Pro with advanced camera and A17 Pro chip. Free shipping available.',
    description: 'SEO description (max 160 characters)'
  })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  seoDescription?: string;

  @ApiPropertyOptional({ 
    example: ['iphone', 'smartphone', 'apple', 'mobile'],
    description: 'SEO keywords'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  seoKeywords?: string[];

  @ApiPropertyOptional({ 
    type: 'object',
    description: 'Additional metadata as JSON',
    example: { weight: 221, dimensions: { length: 159.9, width: 76.7, height: 8.25 } },
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  metaData?: any;

  @ApiProperty({ 
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    description: 'Product images (at least one required)'
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  images: string[];

  @ApiPropertyOptional({ 
    example: ['https://example.com/video1.mp4'],
    description: 'Product videos'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  videos?: string[];

  @ApiPropertyOptional({ 
    example: ['https://example.com/manual.pdf'],
    description: 'Product documents'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  documents?: string[];

  @ApiPropertyOptional({ 
    example: ['electronics', 'premium', 'new-arrival'],
    description: 'Product tags'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ 
    example: 1,
    description: 'Display order (lower numbers appear first)'
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Whether this product is featured'
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether this product has variants'
  })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ 
    example: ['attr_color', 'attr_size'],
    description: 'Attribute IDs that drive product variants'
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(10)
  variantAttributes?: string[];

  @ApiPropertyOptional({ 
    example: '2024-12-31T23:59:59Z',
    description: 'Schedule product for future publishing'
  })
  @IsOptional()
  @IsDateString()
  scheduledPublishAt?: string;

  @ApiPropertyOptional({ 
    type: [CreateProductAttributeValueDto],
    description: 'Product attribute values'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductAttributeValueDto)
  attributeValues?: CreateProductAttributeValueDto[];

  // Transform slug to lowercase and replace spaces with hyphens
  @Transform(({ value, obj }) => {
    if (value) return value.toLowerCase().replace(/\s+/g, '-');
    if (obj.name) return obj.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return undefined;
  })
  private _transformSlug?: string;
}