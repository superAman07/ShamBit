import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoggerService } from '../../infrastructure/observability/logger.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import * as crypto from 'crypto';
import * as path from 'path';

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
    private readonly prisma: PrismaService,
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

    // For now, return a placeholder URL since S3Service doesn't exist
    const uploadUrl = `https://placeholder-bucket.s3.amazonaws.com/${key}?signed=true`;

    // Create media record using Prisma directly
    const media = await this.prisma.mediaFile.create({
      data: {
        filename,
        originalName: uploadDto.filename,
        mimeType: uploadDto.mimeType,
        size: uploadDto.size,
        url: `https://placeholder-bucket.s3.amazonaws.com/${key}`,
        type: uploadDto.type,
        entityId: uploadDto.entityId,
        entityType: uploadDto.entityType,
        metadata: {},
        uploadedBy,
        status: 'PENDING',
      },
    });

    this.logger.log('Signed upload URL generated', { mediaId: media.id, filename });

    return {
      uploadUrl,
      mediaId: media.id,
    };
  }

  private validateFile(uploadDto: UploadSignedUrlDto): void {
    // Check file size
    if (uploadDto.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check mime type based on media type
    const isImage = uploadDto.type === MediaType.PRODUCT_IMAGE || 
                   uploadDto.type === MediaType.VARIANT_IMAGE || 
                   uploadDto.type === MediaType.BANNER_IMAGE || 
                   uploadDto.type === MediaType.BRAND_LOGO || 
                   uploadDto.type === MediaType.USER_AVATAR;

    if (isImage && !this.ALLOWED_IMAGE_TYPES.includes(uploadDto.mimeType)) {
      throw new BadRequestException(`Invalid image type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`);
    }

    if (uploadDto.type === MediaType.DOCUMENT && !this.ALLOWED_DOCUMENT_TYPES.includes(uploadDto.mimeType)) {
      throw new BadRequestException(`Invalid document type. Allowed types: ${this.ALLOWED_DOCUMENT_TYPES.join(', ')}`);
    }
  }

  private generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    return `${name}-${timestamp}-${random}${ext}`;
  }

  private generateS3Key(type: MediaType, filename: string): string {
    const typeFolder = type.toLowerCase().replace('_', '-');
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${typeFolder}/${year}/${month}/${filename}`;
  }

  async findById(id: string): Promise<MediaFile | null> {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
    });

    return mediaFile ? this.mapToMediaFile(mediaFile) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<MediaFile[]> {
    const mediaFiles = await this.prisma.mediaFile.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return mediaFiles.map(this.mapToMediaFile);
  }

  async updateStatus(id: string, status: string): Promise<MediaFile> {
    const mediaFile = await this.prisma.mediaFile.update({
      where: { id },
      data: { status },
    });

    return this.mapToMediaFile(mediaFile);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mediaFile.delete({
      where: { id },
    });
  }

  private mapToMediaFile(prismaData: any): MediaFile {
    return {
      id: prismaData.id,
      filename: prismaData.filename,
      originalName: prismaData.originalName,
      mimeType: prismaData.mimeType,
      size: prismaData.size,
      url: prismaData.url,
      cdnUrl: prismaData.cdnUrl,
      type: prismaData.type,
      entityId: prismaData.entityId,
      entityType: prismaData.entityType,
      metadata: prismaData.metadata || {},
      uploadedBy: prismaData.uploadedBy,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
    };
  }
}