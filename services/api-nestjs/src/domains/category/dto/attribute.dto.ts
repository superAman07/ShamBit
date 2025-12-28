import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AttributeType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  DATE = 'DATE',
  MULTI_SELECT = 'MULTI_SELECT',
}

export enum AttributeInputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  DATE = 'DATE',
  COLOR = 'COLOR',
}

export class AttributeValidationRuleDto {
  @ApiProperty({ example: 'required' })
  @IsString()
  rule: string;

  @ApiProperty({ example: 'This field is required' })
  @IsString()
  message: string;

  @ApiProperty({ example: { min: 1, max: 100 }, required: false })
  @IsOptional()
  params?: any;
}

export class CreateAttributeDto {
  @ApiProperty({ example: 'Brand' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'brand' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Product brand name' })
  @IsString()
  description: string;

  @ApiProperty({ enum: AttributeType })
  @IsEnum(AttributeType)
  type: AttributeType;

  @ApiProperty({ enum: AttributeInputType })
  @IsEnum(AttributeInputType)
  inputType: AttributeInputType;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isVariantAttribute: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isFilterable: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isSearchable: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sortOrder: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ type: [AttributeValidationRuleDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValidationRuleDto)
  validationRules?: AttributeValidationRuleDto[];

  @ApiProperty({ example: 'Enter brand name', required: false })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ example: 'Brand helps customers identify products', required: false })
  @IsOptional()
  @IsString()
  helpText?: string;
}

export class UpdateAttributeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(AttributeInputType)
  inputType?: AttributeInputType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isVariantAttribute?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isSearchable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValidationRuleDto)
  validationRules?: AttributeValidationRuleDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  helpText?: string;
}

export class CategoryAttributeAssignmentDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  attributeId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sortOrder: number;
}