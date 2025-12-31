import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  department: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsString() // Should be enum
  type: string;

  @ApiProperty()
  @IsString() // Should be enum
  experience: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closesAt?: Date;
}
