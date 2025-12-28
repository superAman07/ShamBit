import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Explicitly declare model properties added to the Prisma schema that
  // the generated client provides at runtime. This helps the TypeScript
  // compiler recognise them when type resolution to the generated client
  // isn't available to the language server.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare sagaInstance: any;
  // Declare runtime Prisma model properties that the generated client exposes
  // These are declared as `any` to avoid tight coupling to generated client types
  // and to make them available to the rest of the application for typing.
  // `domainEvent` accessor is provided by PrismaClient; don't redeclare
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare productReadModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare orderReadModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare inventoryReadModel: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare failedProjection: any;
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}