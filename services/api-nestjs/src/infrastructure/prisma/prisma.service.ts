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
  // Brand request model (Prisma generated model)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare brandRequest: any;

  // Allow access to other generated model properties without strict typings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}