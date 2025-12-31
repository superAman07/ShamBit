import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.featureFlag.create({ data });
  }

  async findById(id: string) {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  async findByKey(key: string) {
    return this.prisma.featureFlag.findUnique({ where: { key } });
  }

  async findMany(query: any) {
    return this.prisma.featureFlag.findMany(query);
  }

  async update(id: string, data: any) {
    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  async findAll() {
    return this.prisma.featureFlag.findMany({});
  }

  async findByEnvironment(environment: string) {
    return this.prisma.featureFlag.findMany({
      where: { environment },
    });
  }
}
