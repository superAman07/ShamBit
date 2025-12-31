import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BrandRequest } from '../entities/brand-request.entity';
import {
  BrandRequestStatus,
  BrandRequestType,
} from '../enums/request-status.enum';
import { CreateBrandRequestDto } from '../dtos/brand-request.dto';

export interface BrandRequestFilters {
  requesterId?: string;
  status?: BrandRequestStatus;
  type?: BrandRequestType;
  handledBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BrandRequestPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class BrandRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: BrandRequestFilters = {},
    pagination: BrandRequestPaginationOptions = {},
  ): Promise<{ data: BrandRequest[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply filters
    if (filters.requesterId) {
      where.requesterId = filters.requesterId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.handledBy) {
      where.handledBy = filters.handledBy;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.brandRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          handledByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.brandRequest.count({ where }),
    ]);

    return {
      data: data.map(this.mapToDomain),
      total,
    };
  }

  async findById(id: string): Promise<BrandRequest | null> {
    const request = await this.prisma.brandRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        handledByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return request ? this.mapToDomain(request) : null;
  }

  async create(
    data: CreateBrandRequestDto & { requesterId: string },
  ): Promise<BrandRequest> {
    const request = await this.prisma.brandRequest.create({
      data: {
        ...data,
        status: BrandRequestStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return this.mapToDomain(request);
  }

  async update(id: string, data: Partial<BrandRequest>): Promise<BrandRequest> {
    const request = await this.prisma.brandRequest.update({
      where: { id },
      data,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        handledByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return this.mapToDomain(request);
  }

  async handleRequest(
    id: string,
    status: BrandRequestStatus.APPROVED | BrandRequestStatus.REJECTED,
    handledBy: string,
    adminNotes?: string,
    rejectionReason?: string,
  ): Promise<BrandRequest> {
    const updateData: any = {
      status,
      handledBy,
      handledAt: new Date(),
      adminNotes,
    };

    if (status === BrandRequestStatus.REJECTED && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const request = await this.prisma.brandRequest.update({
      where: { id },
      data: updateData,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        handledByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return this.mapToDomain(request);
  }

  async findPendingRequests(): Promise<BrandRequest[]> {
    const requests = await this.prisma.brandRequest.findMany({
      where: {
        status: BrandRequestStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return requests.map(this.mapToDomain);
  }

  async findByRequesterId(requesterId: string): Promise<BrandRequest[]> {
    const requests = await this.prisma.brandRequest.findMany({
      where: { requesterId },
      include: {
        handledByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map(this.mapToDomain);
  }

  async countByStatus(
    requesterId?: string,
  ): Promise<Record<BrandRequestStatus, number>> {
    const where: any = {};

    if (requesterId) {
      where.requesterId = requesterId;
    }

    const counts = await this.prisma.brandRequest.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const result = Object.values(BrandRequestStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<BrandRequestStatus, number>,
    );

    counts.forEach(({ status, _count }) => {
      result[status] = _count;
    });

    return result;
  }

  async findDuplicateRequests(
    brandName: string,
    brandSlug: string,
    requesterId: string,
  ): Promise<BrandRequest[]> {
    const requests = await this.prisma.brandRequest.findMany({
      where: {
        OR: [
          { brandName: { equals: brandName, mode: 'insensitive' } },
          { brandSlug },
        ],
        requesterId,
        status: BrandRequestStatus.PENDING,
      },
    });

    return requests.map(this.mapToDomain);
  }

  private mapToDomain(prismaData: any): BrandRequest {
    return new BrandRequest({
      id: prismaData.id,
      type: prismaData.type,
      status: prismaData.status,
      brandName: prismaData.brandName,
      brandSlug: prismaData.brandSlug,
      description: prismaData.description,
      logoUrl: prismaData.logoUrl,
      websiteUrl: prismaData.websiteUrl,
      categoryIds: prismaData.categoryIds,
      businessJustification: prismaData.businessJustification,
      expectedUsage: prismaData.expectedUsage,
      brandId: prismaData.brandId,
      requesterId: prismaData.requesterId,
      handledBy: prismaData.handledBy,
      handledAt: prismaData.handledAt,
      adminNotes: prismaData.adminNotes,
      rejectionReason: prismaData.rejectionReason,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
    });
  }
}
