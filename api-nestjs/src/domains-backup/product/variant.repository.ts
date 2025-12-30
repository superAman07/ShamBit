import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class VariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        pricing: true,
        inventory: true,
        images: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
        pricing: true,
        inventory: true,
        images: true,
      },
    });
  }
}