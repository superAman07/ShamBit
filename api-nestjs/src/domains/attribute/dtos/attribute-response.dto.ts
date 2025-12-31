import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttributeDataType } from '../enums/attribute-data-type.enum';
import { AttributeStatus } from '../enums/attribute-status.enum';
import { AttributeVisibility } from '../enums/attribute-visibility.enum';
import type { AttributeValidationRule } from '../entities/attribute.entity';

export class AttributeOptionResponseDto {
  @ApiProperty({ example: 'opt_123' })
  id: string;

  @ApiProperty({ example: 'red' })
  value: string;

  @ApiProperty({ example: 'Red' })
  label: string;

  @ApiPropertyOptional({ example: 'Bright red color' })
  description?: string;

  @ApiPropertyOptional({ example: '#FF0000' })
  color?: string;

  @ApiPropertyOptional({ example: 'https://example.com/red.jpg' })
  imageUrl?: string;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  hasColor: boolean;

  @ApiProperty({ example: false })
  hasImage: boolean;

  @ApiProperty({ example: true })
  isVisual: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;
}

export class AttributeLocalizationResponseDto {
  @ApiProperty({ example: 'loc_123' })
  id: string;

  @ApiProperty({ example: 'en' })
  locale: string;

  @ApiProperty({ example: 'Color' })
  name: string;

  @ApiPropertyOptional({ example: 'Product color attribute' })
  description?: string;

  @ApiPropertyOptional({ example: 'Choose a color...' })
  helpText?: string;

  @ApiPropertyOptional({ example: 'Select color' })
  placeholder?: string;

  @ApiProperty({ example: 'en' })
  languageCode: string;

  @ApiPropertyOptional({ example: 'US' })
  countryCode?: string;

  @ApiProperty({ example: true })
  isComplete: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;
}

export class AttributeResponseDto {
  @ApiProperty({ example: 'attr_123' })
  id: string;

  @ApiProperty({ example: 'Color' })
  name: string;

  @ApiProperty({ example: 'color' })
  slug: string;

  @ApiPropertyOptional({ example: 'Product color selection' })
  description?: string;

  @ApiProperty({ enum: AttributeDataType, example: AttributeDataType.ENUM })
  dataType: AttributeDataType;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  validation?: AttributeValidationRule;

  @ApiProperty({ example: false })
  isRequired: boolean;

  @ApiProperty({ example: true })
  isVariant: boolean;

  @ApiProperty({ example: true })
  isFilterable: boolean;

  @ApiProperty({ example: false })
  isSearchable: boolean;

  @ApiProperty({ example: false })
  isComparable: boolean;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiPropertyOptional({ example: 'Physical Properties' })
  groupName?: string;

  @ApiPropertyOptional({ example: 'Choose the primary color' })
  helpText?: string;

  @ApiPropertyOptional({ example: 'Select a color...' })
  placeholder?: string;

  @ApiProperty({
    enum: AttributeVisibility,
    example: AttributeVisibility.PUBLIC,
  })
  visibility: AttributeVisibility;

  @ApiProperty({ example: false })
  adminOnly: boolean;

  @ApiProperty({ example: true })
  isLocalizable: boolean;

  @ApiProperty({ enum: AttributeStatus, example: AttributeStatus.ACTIVE })
  status: AttributeStatus;

  @ApiProperty({ example: 'admin_123' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'admin_456' })
  updatedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-03T00:00:00Z' })
  deletedAt?: Date;

  // Computed Properties
  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isUsable: boolean;

  @ApiProperty({ example: true })
  requiresOptions: boolean;

  @ApiProperty({ example: false })
  isNumeric: boolean;

  @ApiProperty({ example: false })
  isText: boolean;

  @ApiProperty({ example: true })
  isSelection: boolean;

  @ApiProperty({ example: false })
  isDate: boolean;

  @ApiProperty({ example: false })
  isFile: boolean;

  // Relationships
  @ApiPropertyOptional({ type: [AttributeOptionResponseDto] })
  options?: AttributeOptionResponseDto[];

  @ApiPropertyOptional({ type: [AttributeLocalizationResponseDto] })
  localizations?: AttributeLocalizationResponseDto[];
}

export class AttributeListResponseDto {
  @ApiProperty({ type: [AttributeResponseDto] })
  data: AttributeResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class AttributeValueResponseDto {
  @ApiProperty({ example: 'val_123' })
  id: string;

  @ApiProperty({ example: 'PRODUCT' })
  entityType: string;

  @ApiProperty({ example: 'prod_123' })
  entityId: string;

  @ApiProperty({ example: 'attr_123' })
  attributeId: string;

  @ApiProperty({ example: 'red' })
  value: any;

  @ApiProperty({ example: 'Red' })
  displayValue: string;

  @ApiProperty({ example: 'en' })
  locale: string;

  @ApiProperty({ example: true })
  hasValue: boolean;

  @ApiProperty({ example: false })
  isEmpty: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: AttributeResponseDto })
  attribute?: AttributeResponseDto;

  @ApiPropertyOptional({ type: AttributeOptionResponseDto })
  option?: AttributeOptionResponseDto;
}

export class AttributeStatisticsDto {
  @ApiProperty({ example: 150 })
  totalAttributes: number;

  @ApiProperty({ example: 125 })
  activeAttributes: number;

  @ApiProperty({ example: 15 })
  draftAttributes: number;

  @ApiProperty({ example: 8 })
  deprecatedAttributes: number;

  @ApiProperty({ example: 2 })
  archivedAttributes: number;

  @ApiProperty({ example: 45 })
  variantAttributes: number;

  @ApiProperty({ example: 89 })
  filterableAttributes: number;

  @ApiProperty({ example: 23 })
  searchableAttributes: number;

  @ApiProperty({ example: 67 })
  localizableAttributes: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { ENUM: 45, STRING: 32, NUMBER: 28 },
  })
  attributesByType: Record<string, number>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { 'Physical Properties': 25, 'Technical Specs': 18 },
  })
  attributesByGroup: Record<string, number>;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  lastUpdated: Date;
}

export class AttributeValidationResultDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: [] })
  errors: string[];

  @ApiProperty({ example: [] })
  warnings: string[];

  @ApiPropertyOptional({ example: 'Attribute is valid' })
  message?: string;
}
