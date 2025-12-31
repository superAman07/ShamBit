import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  Length,
  Matches,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  BrandRequestType,
  BrandRequestStatus,
} from '../enums/request-status.enum';
import { BrandScope } from '../enums/brand-scope.enum';

export class CreateBrandRequestDto {
  @ApiProperty({
    description: 'Type of brand request',
    enum: BrandRequestType,
    example: BrandRequestType.NEW_BRAND,
  })
  @IsEnum(BrandRequestType)
  type: BrandRequestType;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate requests (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @IsUUID(4)
  idempotencyKey?: string;

  @ApiProperty({
    description: 'Requested brand name',
    example: 'Nike',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  brandName: string;

  @ApiProperty({
    description: 'Requested brand slug',
    example: 'nike',
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @Length(2, 100)
  @Transform(({ value }) => value?.toLowerCase())
  brandSlug: string;

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
    description: 'Requested brand scope',
    enum: BrandScope,
    example: BrandScope.SELLER_PRIVATE,
  })
  @IsEnum(BrandScope)
  scope: BrandScope = BrandScope.SELLER_PRIVATE;

  @ApiProperty({
    description: 'Array of category IDs this brand should belong to',
    example: ['cat_123', 'cat_456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  categoryIds: string[];

  @ApiProperty({
    description: 'Business justification for the brand request',
    example:
      'We are an authorized retailer of Nike products and need to list them under the official brand.',
    minLength: 50,
    maxLength: 2000,
  })
  @IsString()
  @Length(50, 2000)
  businessJustification: string;

  @ApiPropertyOptional({
    description: 'Expected usage and volume',
    example:
      'We plan to list approximately 100 Nike products across footwear and apparel categories.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  expectedUsage?: string;

  @ApiPropertyOptional({
    description: 'Existing brand ID (for update/reactivation requests)',
    example: 'brand_123',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  brandId?: string;
}

export class HandleBrandRequestDto {
  @ApiProperty({
    description: 'Decision on the brand request',
    enum: [BrandRequestStatus.APPROVED, BrandRequestStatus.REJECTED],
    example: BrandRequestStatus.APPROVED,
  })
  @IsEnum([BrandRequestStatus.APPROVED, BrandRequestStatus.REJECTED])
  status: BrandRequestStatus.APPROVED | BrandRequestStatus.REJECTED;

  @ApiPropertyOptional({
    description: 'Admin notes for the decision',
    example: 'Approved after verifying seller authorization documents.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
    example: 'Insufficient documentation provided for brand authorization.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  rejectionReason?: string;
}
