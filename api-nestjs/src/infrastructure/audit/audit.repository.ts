import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.auditLog.create({ data });
  }

  async findMany(query: any) {
    return this.prisma.auditLog.findMany(query);
  }
}
