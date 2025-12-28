import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { ImageProcessingService } from './image-processing.service';
import { S3Service } from './s3.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaRepository,
    ImageProcessingService,
    S3Service,
  ],
  exports: [MediaService, ImageProcessingService, S3Service],
})
export class MediaModule {}