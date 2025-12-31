import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  ValidateNested,
  IsArray,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttributeDataType } from '../enums/attribute-data-type.enum';
import { AttributeVisibility } from '../enums/attribute-visibility.enum';
import type { AttributeValidationRule } from '../entities/attribute.entity';

export class CreateAttributeOptionDto {
  @ApiProperty({ example: 'red', description: 'Internal value for the option' })
  @IsString()
  @Length(1, 100)
  value: string;

  @ApiProperty({ example: 'Red', description: 'Display label for the option' })
  @IsString()
  @Length(1, 200)
  label: string;

  @ApiPropertyOptional({
    example: 'Bright red color',
    description: 'Optional description',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    example: '#FF0000',
    description: 'Hex color code for color swatches',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/red.jpg',
    description: 'Image URL for visual options',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order (lower numbers appear first)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is the default option',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateAttributeLocalizationDto {
  @ApiProperty({ example: 'en', description: 'Locale code (e.g., en, es, fr)' })
  @IsString()
  @Length(2, 10)
  locale: string;

  @ApiProperty({ example: 'Color', description: 'Localized attribute name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({
    example: 'Product color attribute',
    description: 'Localized description',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Choose a color...',
    description: 'Localized help text',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  helpText?: string;

  @ApiPropertyOptional({
    example: 'Select color',
    description: 'Localized placeholder text',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  placeholder?: string;
}

export class CreateAttributeDto {
  @ApiProperty({ example: 'Color', description: 'Attribute name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({
    example: 'color',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Product color selection',
    description: 'Attribute description',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    enum: AttributeDataType,
    example: AttributeDataType.ENUM,
    description: 'Data type of the attribute',
  })
  @IsEnum(AttributeDataType)
  dataType: AttributeDataType;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Validation rules for the attribute',
    example: { minLength: 1, maxLength: 100 },
  })
  @IsOptional()
  @IsObject()
  validation?: AttributeValidationRule;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this attribute is required',
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this attribute drives product variants',
  })
  @IsOptional()
  @IsBoolean()
  isVariant?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this attribute can be used in filters',
  })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this attribute is searchable',
  })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this attribute can be used in comparisons',
  })
  @IsOptional()
  @IsBoolean()
  isComparable?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order (lower numbers appear first)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @ApiPropertyOptional({
    example: 'Physical Properties',
    description: 'Logical group name',
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  groupName?: string;

  @ApiPropertyOptional({
    example: 'Choose the primary color',
    description: 'Help text for users',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  helpText?: string;

  @ApiPropertyOptional({
    example: 'Select a color...',
    description: 'Input placeholder text',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  placeholder?: string;

  @ApiPropertyOptional({
    enum: AttributeVisibility,
    example: AttributeVisibility.PUBLIC,
    description: 'Visibility level of the attribute',
  })
  @IsOptional()
  @IsEnum(AttributeVisibility)
  visibility?: AttributeVisibility;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether only admins can set values',
  })
  @IsOptional()
  @IsBoolean()
  adminOnly?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this attribute supports localization',
  })
  @IsOptional()
  @IsBoolean()
  isLocalizable?: boolean;

  @ApiPropertyOptional({
    type: [CreateAttributeOptionDto],
    description: 'Options for ENUM and MULTI_ENUM attributes',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeOptionDto)
  options?: CreateAttributeOptionDto[];

  @ApiPropertyOptional({
    type: [CreateAttributeLocalizationDto],
    description: 'Localizations for the attribute',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeLocalizationDto)
  localizations?: CreateAttributeLocalizationDto[];

  // Transform slug to lowercase and replace spaces with hyphens
  @Transform(({ value, obj }) => {
    if (value) return value.toLowerCase().replace(/\s+/g, '-');
    if (obj.name) return obj.name.toLowerCase().replace(/\s+/g, '-');
    return undefined;
  })
  private _transformSlug?: string;
}
