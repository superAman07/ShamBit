import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Brand } from '../entities/brand.entity';
import { BrandStatus } from '../enums/brand-status.enum';
import { CreateBrandDto } from '../dtos/create-brand.dto';
import { UpdateBrandDto } from '../dtos/update-brand.dto';

export interface BrandFilters {
  sellerId?: string;
  status?: BrandStatus;
  isGlobal?: boolean;
  isVerified?: boolean;
  categoryIds?: string[];
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: BrandFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Brand[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    // Apply filters
    if (filters.sellerId !== undefined) {
      if (filters.sellerId === null) {
        where.isGlobal = true;
      } else {
        where.OR = [
          { isGlobal: true },
          { sellerId: filters.sellerId },
        ];
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.isGlobal !== undefined) {
      where.isGlobal = filters.isGlobal;
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    if (filters.categoryIds?.length) {
      where.categories = {
        some: {
          categoryId: {
            in: filters.categoryIds,
          },
        },
      };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      data: data.map(this.mapToDomain),
      total,
    };
  }

  async findById(id: string): Promise<Brand | null> {
    const brand = await this.prisma.brand.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return brand ? this.mapToDomain(brand) : null;
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    const brand = await this.prisma.brand.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return brand ? this.mapToDomain(brand) : null;
  }

  async create(data: CreateBrandDto & { createdBy: string; status: BrandStatus }): Promise<Brand> {
    const { categoryIds, ...brandData } = data;

    const brand = await this.prisma.brand.create({
      data: {
        ...brandData,
        categories: {
          create: categoryIds.map((categoryId, index) => ({
            categoryId,
            isPrimary: index === 0,
            createdBy: data.createdBy,
          })),
        },
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return this.mapToDomain(brand);
  }

  async update(id: string, data: UpdateBrandDto & { updatedBy: string }): Promise<Brand> {
    const { categoryIds, ...brandData } = data;

    const updateData: any = {
      ...brandData,
      updatedBy: data.updatedBy,
    };

    // Handle category updates if provided
    if (categoryIds) {
      updateData.categories = {
        deleteMany: {},
        create: categoryIds.map((categoryId, index) => ({
          categoryId,
          isPrimary: index === 0,
          createdBy: data.updatedBy,
        })),
      };
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: updateData,
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return this.mapToDomain(brand);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        status: BrandStatus.INACTIVE,
      },
    });
  }

  async updateStatus(id: string, status: BrandStatus, updatedBy: string): Promise<Brand> {
    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        status,
        updatedBy,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return this.mapToDomain(brand);
  }

  async findBySellerId(sellerId: string): Promise<Brand[]> {
    const brands = await this.prisma.brand.findMany({
      where: {
        sellerId,
        deletedAt: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return brands.map(this.mapToDomain);
  }

  async countByStatus(sellerId?: string): Promise<Record<BrandStatus, number>> {
    const where: any = { deletedAt: null };
    
    if (sellerId) {
      where.OR = [
        { isGlobal: true },
        { sellerId },
      ];
    }

    const counts = await this.prisma.brand.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const result = Object.values(BrandStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<BrandStatus, number>);

    counts.forEach(({ status, _count }) => {
      result[status] = _count;
    });

    return result;
  }

  private mapToDomain(prismaData: any): Brand {
    return new Brand({
      id: prismaData.id,
      name: prismaData.name,
      slug: prismaData.slug,
      description: prismaData.description,
      logoUrl: prismaData.logoUrl,
      websiteUrl: prismaData.websiteUrl,
      status: prismaData.status,
      isGlobal: prismaData.isGlobal,
      isVerified: prismaData.isVerified,
      sellerId: prismaData.sellerId,
      metadata: prismaData.metadata,
      categoryIds: prismaData.categories?.map((c: any) => c.categoryId) || [],
      createdBy: prismaData.createdBy,
      updatedBy: prismaData.updatedBy,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
      deletedAt: prismaData.deletedAt,
      deletedBy: prismaData.deletedBy,
    });
  }
}