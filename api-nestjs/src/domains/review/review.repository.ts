import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.review.create({ data });
  }

  async findById(id: string) {
    return this.prisma.review.findUnique({ where: { id } });
  }

  async findMany(query: any) {
    return this.prisma.review.findMany(query);
  }

  async update(id: string, data: any) {
    return this.prisma.review.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.review.delete({ where: { id } });
  }

  async findByUserAndEntity(userId: string, type: string, entityId: string) {
    return this.prisma.review.findFirst({
      where: { userId, type, entityId },
    });
  }
}
