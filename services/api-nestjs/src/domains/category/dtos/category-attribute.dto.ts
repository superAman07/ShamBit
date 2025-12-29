import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AttributeType } from '../enums/attribute-type.enum';
import type { AttributeValidationRules } from '../entities/category-attribute.entity';

export class CreateCategoryAttributeDto {
  @ApiProperty({
    description: 'Attribute name',
    example: 'Color',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Attribute slug (auto-generated if not provided)',
    example: 'color',
    pattern: '^[a-z0-9_]+$',
  })
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  slug: string;

  @ApiProperty({
    description: 'Attribute data type',
    enum: AttributeType,
    example: AttributeType.SELECT,
  })
  @IsEnum(AttributeType)
  type: AttributeType;

  @ApiPropertyOptional({
    description: 'Attribute description',
    example: 'Product color selection',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this attribute is required for products',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether this attribute can be inherited by child categories',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isInheritable?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether this attribute can be overridden in child categories',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isOverridable?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether this attribute drives product variants',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVariant?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether this attribute can be used in search filters',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether this attribute is included in search index',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean = false;

  @ApiPropertyOptional({
    description: 'Default value for the attribute',
    example: 'Black',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({
    description: 'Allowed values for SELECT/MULTI_SELECT types',
    example: ['Red', 'Blue', 'Green', 'Black', 'White'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedValues?: string[] = [];

  @ApiPropertyOptional({
    description: 'Type-specific validation rules',
    example: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 50,
      REGEX_PATTERN: '^[A-Za-z]+$',
    },
  })
  @IsOptional()
  @IsObject()
  validationRules?: AttributeValidationRules;

  @ApiPropertyOptional({
    description: 'Display order for sorting',
    example: 1,
    minimum: 0,
    maximum: 999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  displayOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Human-readable display name',
    example: 'Product Color',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Help text for sellers',
    example: 'Select the primary color of the product',
  })
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional({
    description: 'Input placeholder text',
    example: 'Choose a color...',
  })
  @IsOptional()
  @IsString()
  placeholder?: string;
}

export class UpdateCategoryAttributeDto extends PartialType(CreateCategoryAttributeDto) {}

export class CategoryAttributeResponseDto {
  @ApiProperty({ example: 'attr_123' })
  id: string;

  @ApiProperty({ example: 'cat_123' })
  categoryId: string;

  @ApiProperty({ example: 'Color' })
  name: string;

  @ApiProperty({ example: 'color' })
  slug: string;

  @ApiProperty({ enum: AttributeType, example: AttributeType.SELECT })
  type: AttributeType;

  @ApiPropertyOptional({ example: 'Product color selection' })
  description?: string;

  @ApiProperty({ example: false })
  isRequired: boolean;

  @ApiProperty({ example: true })
  isInheritable: boolean;

  @ApiProperty({ example: true })
  isOverridable: boolean;

  @ApiProperty({ example: true })
  isVariant: boolean;

  @ApiProperty({ example: true })
  isFilterable: boolean;

  @ApiProperty({ example: false })
  isSearchable: boolean;

  @ApiPropertyOptional({ example: 'Black' })
  defaultValue?: string;

  @ApiProperty({ example: ['Red', 'Blue', 'Green'] })
  allowedValues: string[];

  @ApiPropertyOptional()
  validationRules?: AttributeValidationRules;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiPropertyOptional({ example: 'Product Color' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'Select the primary color' })
  helpText?: string;

  @ApiPropertyOptional({ example: 'Choose a color...' })
  placeholder?: string;

  @ApiPropertyOptional({ example: 'cat_parent123' })
  inheritedFrom?: string;

  @ApiPropertyOptional({ example: 'cat_child456' })
  overriddenAt?: string;

  @ApiProperty({ example: 'admin_123' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'admin_456' })
  updatedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;
}

export class InheritAttributeDto {
  @ApiProperty({
    description: 'Source category ID to inherit attributes from',
    example: 'cat_parent123',
  })
  @IsString()
  sourceCategoryId: string;

  @ApiPropertyOptional({
    description: 'Specific attribute slugs to inherit (empty = all inheritable)',
    example: ['color', 'size'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributeSlugs?: string[];

  @ApiPropertyOptional({
    description: 'Whether to override existing attributes',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  overrideExisting?: boolean = false;
}

export class OverrideAttributeDto {
  @ApiProperty({
    description: 'Attribute slug to override',
    example: 'color',
  })
  @IsString()
  attributeSlug: string;

  @ApiPropertyOptional({
    description: 'New allowed values (for SELECT types)',
    example: ['Red', 'Blue'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedValues?: string[];

  @ApiPropertyOptional({
    description: 'New default value',
    example: 'Red',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({
    description: 'New validation rules',
  })
  @IsOptional()
  @IsObject()
  validationRules?: AttributeValidationRules;

  @ApiPropertyOptional({
    description: 'Reason for override',
    example: 'Category-specific color options',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}