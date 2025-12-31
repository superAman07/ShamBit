import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateJobDto } from '../dtos/create-job.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { PaginationQuery } from '../../../common/types';

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: PaginationQuery & {
      department?: string;
      location?: string;
      status?: string;
    },
  ) {
    const { page = 1, limit = 10, department, location, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (department) where.department = department;
    if (location) where.location = location;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        poster: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async create(data: CreateJobDto & { postedBy: string }) {
    const { postedBy, ...jobData } = data;
    return this.prisma.job.create({
      data: {
        ...jobData,
        postedBy,
      },
    });
  }

  async update(id: string, data: UpdateJobDto) {
    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.job.delete({
      where: { id },
    });
  }
}
