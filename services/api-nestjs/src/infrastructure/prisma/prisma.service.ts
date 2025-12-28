import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Payment system models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare paymentIntent: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare paymentTransaction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare paymentAttempt: any;
  
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}