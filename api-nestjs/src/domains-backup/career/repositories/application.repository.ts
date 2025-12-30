import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { PaginationQuery } from '../../../common/types';

@Injectable()
export class ApplicationRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(query: PaginationQuery & { jobId?: string; status?: string }) {
        const { page = 1, limit = 10, jobId, status } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (jobId) where.jobId = jobId;
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            this.prisma.application.findMany({
                where,
                skip,
                take: limit,
                orderBy: { appliedAt: 'desc' },
                include: {
                    job: { select: { title: true } },
                    user: { select: { name: true, email: true } },
                },
            }),
            this.prisma.application.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    async findById(id: string) {
        return this.prisma.application.findUnique({
            where: { id },
            include: {
                job: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
    }

    async create(data: CreateApplicationDto & { jobId: string; userId?: string }) {
        return this.prisma.application.create({
            data,
        });
    }

    async updateStatus(id: string, status: string, reviewedBy: string, notes?: string) {
        return this.prisma.application.update({
            where: { id },
            data: {
                status,
                reviewedBy,
                reviewedAt: new Date(),
                notes,
            },
        });
    }
}
