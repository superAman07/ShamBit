import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { JobService } from './job.service';
import { ImageProcessingWorker } from './workers/image-processing.worker';
import { NotificationWorker } from './workers/notification.worker';
import { SearchIndexWorker } from './workers/search-index.worker';
import { InventoryWorker } from './workers/inventory.worker';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'image-processing' },
      { name: 'notifications' },
      { name: 'search-index' },
      { name: 'inventory' },
    ),
  ],
  providers: [
    JobService,
    ImageProcessingWorker,
    NotificationWorker,
    SearchIndexWorker,
    InventoryWorker,
  ],
  exports: [JobService, BullModule],
})
export class JobsModule {}
