import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class OrderItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.orderItem.create({
      data,
    });
  }

  async findByOrderId(orderId: string) {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}