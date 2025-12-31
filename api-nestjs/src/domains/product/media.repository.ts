import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProductImage(data: {
    productId: string;
    url: string;
    altText?: string;
    sortOrder: number;
  }) {
    return this.prisma.productImage.create({
      data,
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
