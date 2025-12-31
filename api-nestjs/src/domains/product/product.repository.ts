import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateProductDto, ProductStatus } from './dto/product.dto';
import { PaginationQuery } from '../../common/types';
import { Product } from '@prisma/client';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery, sellerId?: string) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where = sellerId ? { sellerId } : {};

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          brand: true,
          variants: {
            take: 5, // Limit variants for list view
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            pricing: true,
            inventory: true,
          },
        },
        images: true,
      },
    });
  }

  async findBySlug(slug: string): Promise<any | null> {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { isActive: true },
          include: {
            pricing: true,
            inventory: true,
          },
        },
        images: true,
      },
    });
  }

  async create(
    data: CreateProductDto & { sellerId: string; status: ProductStatus },
  ) {
    const { images, ...productData } = data;

    return this.prisma.product.create({
      data: {
        ...productData,
        attributeValues: productData.attributeValues || {},
        images: images
          ? {
              create: images.map((url: string, index: number) => ({
                url,
                displayOrder: index,
                isActive: true,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        attributeValues: data.attributeValues || undefined,
      },
      include: {
        category: true,
        brand: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }

  async hasActiveOrders(productId: string): Promise<boolean> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        variant: {
          productId,
        },
        order: {
          status: {
            in: [
              'PENDING_PAYMENT',
              'PAYMENT_CONFIRMED',
              'PROCESSING',
              'SHIPPED',
            ],
          },
        },
      },
    });

    return !!orderItem;
  }
}
