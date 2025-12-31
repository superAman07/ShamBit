import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CreateAttributeDto } from './create-attribute.dto';
import { AttributeStatus } from '../enums/attribute-status.enum';

export class UpdateAttributeDto extends PartialType(
  OmitType(CreateAttributeDto, ['dataType'] as const),
) {
  // Note: dataType is omitted because it cannot be changed after creation
  // This prevents breaking existing attribute values
}

export class AttributeStatusUpdateDto {
  @ApiPropertyOptional({
    enum: AttributeStatus,
    example: AttributeStatus.ACTIVE,
    description: 'New status for the attribute',
  })
  @IsEnum(AttributeStatus)
  status: AttributeStatus;

  @ApiPropertyOptional({
    example: 'Activating attribute for production use',
    description: 'Reason for status change',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class BulkAttributeUpdateDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['attr_123', 'attr_456'],
    description: 'Array of attribute IDs to update',
  })
  attributeIds: string[];

  @ApiPropertyOptional({
    enum: AttributeStatus,
    example: AttributeStatus.ACTIVE,
    description: 'New status for all attributes',
  })
  @IsOptional()
  @IsEnum(AttributeStatus)
  status?: AttributeStatus;

  @ApiPropertyOptional({
    example: 'Physical Properties',
    description: 'New group name for all attributes',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  groupName?: string;

  @ApiPropertyOptional({
    example: 'Bulk update for reorganization',
    description: 'Reason for bulk update',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}
