import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MediaRepository } from './media.repository';
import { S3Service } from './s3.service';
import { ImageProcessingService } from './image-processing.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export enum MediaType {
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  VARIANT_IMAGE = 'VARIANT_IMAGE',
  BANNER_IMAGE = 'BANNER_IMAGE',
  BRAND_LOGO = 'BRAND_LOGO',
  USER_AVATAR = 'USER_AVATAR',
  DOCUMENT = 'DOCUMENT',
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl?: string;
  type: MediaType;
  entityId?: string;
  entityType?: string;
  metadata: {
    width?: number;
    height?: number;
    altText?: string;
    description?: string;
  };
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadSignedUrlDto {
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  entityId?: string;
  entityType?: string;
}

@Injectable()
export class MediaService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly s3Service: S3Service,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async generateSignedUploadUrl(
    uploadDto: UploadSignedUrlDto,
    uploadedBy: string,
  ): Promise<{ uploadUrl: string; mediaId: string }> {
    this.logger.log('MediaService.generateSignedUploadUrl', { uploadDto, uploadedBy });

    // Validate file
    this.validateFile(uploadDto);

    // Generate unique filename
    const filename = this.generateUniqueFilename(uploadDto.filename);
    const key = this.generateS3Key(uploadDto.type, filename);

    // Generate signed URL
    const uploadUrl = await this.s3Service.generateSignedUploadUrl(
      key,
      uploadDto.mimeType,
      uploadDto.size,
    );

    // Create media record
    const media = await this.mediaRepository.create({
      filename,
      originalName: uploadDto.filename,
      mimeType: uploadDto.mimeType,
      size: uploadDto.size,
      url: `${this.s3Service.getBaseUrl()}/${key}`,
      type: uploadDto.type,
      entityId: uploadDto.entityId,
      entityType: uploadDto.entityType,
      metadata: {},
      uploadedBy,
      status: 'PENDING',
    });

    this.logger.log('Signed upload URL generated', { mediaId: media.id, filename });

    return {
      uploadUrl,
      mediaId: media.id,
    };
  }
}