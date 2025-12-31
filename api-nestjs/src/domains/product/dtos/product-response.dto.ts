import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductVisibility } from '../enums/product-visibility.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';
import type { ProductMetadata } from '../entities/product.entity';

export class ProductAttributeValueResponseDto {
  @ApiProperty({ example: 'val_123' })
  id: string;

  @ApiProperty({ example: 'attr_123' })
  attributeId: string;

  @ApiProperty({ example: 'Color' })
  attributeName: string;

  @ApiProperty({ example: 'Red' })
  value: any;

  @ApiProperty({ example: 'Red' })
  displayValue: string;

  @ApiProperty({ example: 'en' })
  locale: string;

  @ApiProperty({ example: false })
  isInherited: boolean;

  @ApiProperty({ example: false })
  isOverridden: boolean;

  @ApiPropertyOptional({ example: 'cat_123' })
  inheritedFrom?: string;
}

export class ProductCategoryResponseDto {
  @ApiProperty({ example: 'cat_123' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 'electronics' })
  slug: string;

  @ApiProperty({ example: '/electronics' })
  path: string;
}

export class ProductBrandResponseDto {
  @ApiProperty({ example: 'brand_123' })
  id: string;

  @ApiProperty({ example: 'Apple' })
  name: string;

  @ApiProperty({ example: 'apple' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/apple-logo.png' })
  logoUrl?: string;
}

export class ProductSellerResponseDto {
  @ApiProperty({ example: 'seller_123' })
  id: string;

  @ApiProperty({ example: 'Tech Store Inc.' })
  name: string;

  @ApiPropertyOptional({ example: 'tech-store' })
  slug?: string;

  @ApiPropertyOptional({ example: 'https://example.com/store-logo.png' })
  logoUrl?: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'prod_123' })
  id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  name: string;

  @ApiProperty({ example: 'iphone-15-pro' })
  slug: string;

  @ApiPropertyOptional({
    example: 'The latest iPhone with advanced camera system and A17 Pro chip.',
  })
  description?: string;

  @ApiPropertyOptional({ example: 'Latest iPhone with advanced features' })
  shortDescription?: string;

  @ApiProperty({ example: 'cat_123' })
  categoryId: string;

  @ApiProperty({ example: 'brand_123' })
  brandId: string;

  @ApiProperty({ example: 'seller_123' })
  sellerId: string;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.PUBLISHED })
  status: ProductStatus;

  @ApiProperty({ enum: ProductVisibility, example: ProductVisibility.PUBLIC })
  visibility: ProductVisibility;

  @ApiProperty({
    enum: ProductModerationStatus,
    example: ProductModerationStatus.APPROVED,
  })
  moderationStatus: ProductModerationStatus;

  @ApiPropertyOptional({ example: 'Product meets all quality standards' })
  moderationNotes?: string;

  @ApiPropertyOptional({ example: 'mod_123' })
  moderatedBy?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  moderatedAt?: Date;

  @ApiPropertyOptional({ example: '2024-01-15T12:00:00Z' })
  publishedAt?: Date;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  scheduledPublishAt?: Date;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro - Best Price' })
  seoTitle?: string;

  @ApiPropertyOptional({
    example:
      'Buy the latest iPhone 15 Pro with advanced camera and A17 Pro chip.',
  })
  seoDescription?: string;

  @ApiProperty({ example: ['iphone', 'smartphone', 'apple'] })
  seoKeywords: string[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metaData?: ProductMetadata;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  images: string[];

  @ApiProperty({ example: ['https://example.com/video1.mp4'] })
  videos: string[];

  @ApiProperty({ example: ['https://example.com/manual.pdf'] })
  documents: string[];

  @ApiProperty({ example: ['electronics', 'premium', 'new-arrival'] })
  tags: string[];

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: true })
  hasVariants: boolean;

  @ApiProperty({ example: ['attr_color', 'attr_size'] })
  variantAttributes: string[];

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: 'seller_123' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'admin_456' })
  updatedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-03T00:00:00Z' })
  deletedAt?: Date;

  @ApiPropertyOptional({ example: 'admin_789' })
  deletedBy?: string;

  // Computed Properties
  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: false })
  isDraft: boolean;

  @ApiProperty({ example: true })
  isApproved: boolean;

  @ApiProperty({ example: false })
  needsModeration: boolean;

  @ApiProperty({ example: true })
  isVisible: boolean;

  @ApiProperty({ example: false })
  canBeEdited: boolean;

  @ApiProperty({ example: true })
  canBePublished: boolean;

  @ApiProperty({ example: false })
  canBeDeleted: boolean;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiProperty({ example: true })
  hasMedia: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/image1.jpg' })
  primaryImage?: string;

  @ApiProperty({ example: false })
  isScheduledForPublishing: boolean;

  // Relationships
  @ApiPropertyOptional({ type: ProductCategoryResponseDto })
  category?: ProductCategoryResponseDto;

  @ApiPropertyOptional({ type: ProductBrandResponseDto })
  brand?: ProductBrandResponseDto;

  @ApiPropertyOptional({ type: ProductSellerResponseDto })
  seller?: ProductSellerResponseDto;

  @ApiPropertyOptional({ type: [ProductAttributeValueResponseDto] })
  attributeValues?: ProductAttributeValueResponseDto[];
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class ProductStatisticsDto {
  @ApiProperty({ example: 1500 })
  totalProducts: number;

  @ApiProperty({ example: 250 })
  draftProducts: number;

  @ApiProperty({ example: 45 })
  submittedProducts: number;

  @ApiProperty({ example: 180 })
  approvedProducts: number;

  @ApiProperty({ example: 950 })
  publishedProducts: number;

  @ApiProperty({ example: 35 })
  rejectedProducts: number;

  @ApiProperty({ example: 25 })
  suspendedProducts: number;

  @ApiProperty({ example: 15 })
  archivedProducts: number;

  @ApiProperty({ example: 125 })
  featuredProducts: number;

  @ApiProperty({ example: 450 })
  productsWithVariants: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { cat_electronics: 450, cat_clothing: 320 },
  })
  productsByCategory: Record<string, number>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { brand_apple: 125, brand_samsung: 98 },
  })
  productsByBrand: Record<string, number>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { seller_123: 45, seller_456: 32 },
  })
  productsBySeller: Record<string, number>;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  lastUpdated: Date;
}

export class ProductValidationResultDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: 85 })
  qualityScore: number;

  @ApiProperty({ example: [] })
  errors: string[];

  @ApiProperty({ example: [] })
  warnings: string[];

  @ApiProperty({
    example: ['Add more product images', 'Improve SEO description'],
  })
  recommendations: string[];

  @ApiPropertyOptional({ example: 'Product meets quality standards' })
  message?: string;
}
