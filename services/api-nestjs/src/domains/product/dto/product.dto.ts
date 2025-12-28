import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Product description' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  slug: string;

  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Brand ID' })
  @IsUUID()
  brandId: string;

  @ApiPropertyOptional({ description: 'Product attribute values' })
  @IsOptional()
  @IsObject()
  attributeValues?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Product images' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Product name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Product attribute values' })
  @IsOptional()
  @IsObject()
  attributeValues?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Product status' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;
}

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  brandId: string;

  @ApiProperty()
  sellerId: string;

  @ApiPropertyOptional()
  attributeValues?: Record<string, any>;

  @ApiPropertyOptional()
  images?: string[];

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  category?: any;

  @ApiPropertyOptional()
  brand?: any;

  @ApiPropertyOptional()
  variants?: any[];
}

export class ProductApprovalDto {
  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status: ProductStatus.APPROVED | ProductStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Approval/rejection reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}