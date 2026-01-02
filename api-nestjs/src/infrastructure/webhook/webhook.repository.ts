import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) { }

  async createSubscription(data: any) {
    return this.prisma.webhookSubscription.create({ data });
  }

  async findManySubscriptions(query: any) {
    return this.prisma.webhookSubscription.findMany(query);
  }

  async updateSubscription(id: string, data: any) {
    return this.prisma.webhookSubscription.update({ where: { id }, data });
  }

  async deleteSubscription(id: string) {
    return this.prisma.webhookSubscription.delete({ where: { id } });
  }

  async createDelivery(data: any) {
    return this.prisma.webhookDelivery.create({ data });
  }

  async findManyDeliveries(query: any) {
    return this.prisma.webhookDelivery.findMany(query);
  }

  async updateDelivery(id: string, data: any) {
    return this.prisma.webhookDelivery.update({ where: { id }, data });
  }

  async deleteDelivery(id: string) {
    return this.prisma.webhookDelivery.delete({ where: { id } });
  }
}
