import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.webhook.create({ data });
  }

  async findMany(query: any) {
    return this.prisma.webhook.findMany(query);
  }

  async update(id: string, data: any) {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.webhook.delete({ where: { id } });
  }
}
