import { PrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  // Augment the PrismaClient type with missing model properties used across the codebase.
  // These are typed as `any` to avoid tight coupling with generated client naming.
  interface PrismaClient {
    tenant?: any;
    userTenant?: any;
  }
}

export {};
