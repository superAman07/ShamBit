import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { LoggerModule } from '../../infrastructure/observability/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}