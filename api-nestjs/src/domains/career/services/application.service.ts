import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationRepository } from '../repositories/application.repository';
import { JobService } from './job.service';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { PaginationQuery } from '../../../common/types';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobService: JobService,
  ) {}

  async createApplication(
    jobId: string,
    applicationDto: CreateApplicationDto,
    userId?: string,
  ) {
    // Verify job exists and is active
    const job = await this.jobService.findById(jobId);
    if (job.status !== 'ACTIVE') {
      throw new BadRequestException(
        'This job is no longer accepting applications',
      );
    }

    return this.applicationRepository.create({
      ...applicationDto,
      jobId,
      userId,
    });
  }

  async findAll(query: PaginationQuery & { jobId?: string; status?: string }) {
    return this.applicationRepository.findAll(query);
  }

  async findById(id: string) {
    const application = await this.applicationRepository.findById(id);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async updateStatus(
    id: string,
    status: string,
    reviewedBy: string,
    notes?: string,
  ) {
    await this.findById(id); // Ensure exists
    return this.applicationRepository.updateStatus(
      id,
      status,
      reviewedBy,
      notes,
    );
  }
}
