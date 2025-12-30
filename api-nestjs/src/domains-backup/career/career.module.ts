import { Module } from '@nestjs/common';
import { CareerController } from './career.controller';
import { JobService } from './services/job.service';
import { JobRepository } from './repositories/job.repository';
import { ApplicationService } from './services/application.service';
import { ApplicationRepository } from './repositories/application.repository';
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
export class CareerModule { }