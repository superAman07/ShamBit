import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty()
    @IsUrl()
    resumeUrl: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    coverLetter?: string;
}
