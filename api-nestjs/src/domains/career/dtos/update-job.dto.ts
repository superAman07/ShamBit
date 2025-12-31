import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsOptional()
  @IsString() // Should be enum
  status?: string;
}
