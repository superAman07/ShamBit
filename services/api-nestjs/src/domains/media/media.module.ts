import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ObservabilityModule } from '../../infrastructure/observability/observability.module';

@Module({
  imports: [PrismaModule, ObservabilityModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}