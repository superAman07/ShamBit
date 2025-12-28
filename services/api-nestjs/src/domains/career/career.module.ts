import { Module } from '@nestjs/common';
import { CareerController } from './career.controller';
import { JobService } from './job.service';
import { JobRepository } from './job.repository';
import { ApplicationService } from './application.service';
import { ApplicationRepository } from './application.repository';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [CareerController],
  providers: [
    JobService,
    JobRepository,
    ApplicationService,
    ApplicationRepository,
  ],
  exports: [JobService, ApplicationService],
})
export class CareerModule {}