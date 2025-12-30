import { IsString, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandPermission } from '../enums/brand-scope.enum';

export class GrantBrandAccessDto {
  @ApiProperty({
    description: 'Seller ID to grant access to',
    example: 'seller_123',
  })
  @IsString()
  @IsUUID()
  sellerId: string;

  @ApiProperty({
    description: 'Permission level to grant',
    enum: BrandPermission,
    example: BrandPermission.USE,
  })
  @IsEnum(BrandPermission)
  permission: BrandPermission;

  @ApiPropertyOptional({
    description: 'Reason for granting access',
    example: 'Authorized retailer partnership',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkGrantBrandAccessDto {
  @ApiProperty({
    description: 'Array of seller IDs to grant access to',
    example: ['seller_123', 'seller_456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  sellerIds: string[];

  @ApiProperty({
    description: 'Permission level to grant',
    enum: BrandPermission,
    example: BrandPermission.USE,
  })
  @IsEnum(BrandPermission)
  permission: BrandPermission;

  @ApiPropertyOptional({
    description: 'Reason for granting access',
    example: 'Bulk authorization for partner retailers',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RevokeBrandAccessDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking access',
    example: 'Partnership terminated',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}