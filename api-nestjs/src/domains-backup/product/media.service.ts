import { Injectable } from '@nestjs/common';
import { MediaRepository } from './media.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly logger: LoggerService,
  ) {}

  async uploadProductImage(productId: string, imageUrl: string, altText?: string) {
    this.logger.log('MediaService.uploadProductImage', { productId, imageUrl });
    
    return this.mediaRepository.createProductImage({
      productId,
      url: imageUrl,
      altText,
      sortOrder: 0,
    });
  }

  // Additional media methods would be implemented here
}