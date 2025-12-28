import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandStatus } from '../enums/brand-status.enum';
import { BrandRequestStatus, BrandRequestType } from '../enums/request-status.enum';
import { BrandMetadata } from '../entities/brand.entity';

export class BrandResponseDto {
  @ApiProperty({ example: 'brand_123' })
  id: string;

  @ApiProperty({ example: 'Nike' })
  name: string;

  @ApiProperty({ example: 'nike' })
  slug: string;

  @ApiPropertyOptional({ example: 'Leading athletic footwear and apparel brand' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://nike.com' })
  websiteUrl?: string;

  @ApiProperty({ enum: BrandStatus, example: BrandStatus.ACTIVE })
  status: BrandStatus;

  @ApiProperty({ example: true })
  isGlobal: boolean;

  @ApiProperty({ example: false })
  isVerified: boolean;

  @ApiPropertyOptional({ example: 'seller_123' })
  sellerId?: string;

  @ApiPropertyOptional()
  metadata?: BrandMetadata;

  @ApiProperty({ example: ['cat_123', 'cat_456'] })
  categoryIds: string[];

  @ApiProperty({ example: 'admin_123' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'admin_456' })
  updatedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;
}

export class BrandRequestResponseDto {
  @ApiProperty({ example: 'req_123' })
  id: string;

  @ApiProperty({ enum: BrandRequestType, example: BrandRequestType.NEW_BRAND })
  type: BrandRequestType;

  @ApiProperty({ enum: BrandRequestStatus, example: BrandRequestStatus.PENDING })
  status: BrandRequestStatus;

  @ApiProperty({ example: 'Nike' })
  brandName: string;

  @ApiProperty({ example: 'nike' })
  brandSlug: string;

  @ApiPropertyOptional({ example: 'Leading athletic footwear and apparel brand' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://nike.com' })
  websiteUrl?: string;

  @ApiProperty({ example: ['cat_123', 'cat_456'] })
  categoryIds: string[];

  @ApiProperty({ example: 'We are an authorized retailer...' })
  businessJustification: string;

  @ApiPropertyOptional({ example: 'We plan to list approximately 100 products...' })
  expectedUsage?: string;

  @ApiPropertyOptional({ example: 'brand_123' })
  brandId?: string;

  @ApiProperty({ example: 'seller_123' })
  requesterId: string;

  @ApiPropertyOptional({ example: 'admin_123' })
  handledBy?: string;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00Z' })
  handledAt?: Date;

  @ApiPropertyOptional({ example: 'Approved after verification' })
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'Insufficient documentation' })
  rejectionReason?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;
}

export class BrandListResponseDto {
  @ApiProperty({ type: [BrandResponseDto] })
  data: BrandResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class BrandRequestListResponseDto {
  @ApiProperty({ type: [BrandRequestResponseDto] })
  data: BrandRequestResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}