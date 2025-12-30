import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';

// Infrastructure
import { PrismaModule } from './infrastructure/prisma/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000'),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),
    
    // Infrastructure
    PrismaModule,
    
    // Core modules
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}