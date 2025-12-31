import { Injectable, NotFoundException } from '@nestjs/common';
import { JobRepository } from '../repositories/job.repository';
import { CreateJobDto } from '../dtos/create-job.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { PaginationQuery } from '../../../common/types';

@Injectable()
export class JobService {
  constructor(private readonly jobRepository: JobRepository) {}

  async getActiveJobs(
    query: PaginationQuery & { department?: string; location?: string },
  ) {
    return this.jobRepository.findAll({ ...query, status: 'ACTIVE' });
  }

  async findById(id: string) {
    const job = await this.jobRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async createJob(createJobDto: CreateJobDto, postedBy: string) {
    return this.jobRepository.create({ ...createJobDto, postedBy });
  }

  async updateJob(id: string, updateJobDto: UpdateJobDto) {
    await this.findById(id); // Ensure exists
    return this.jobRepository.update(id, updateJobDto);
  }

  async deleteJob(id: string) {
    await this.findById(id); // Ensure exists
    return this.jobRepository.delete(id);
  }
}
