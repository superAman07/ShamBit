import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { createLogger, AppError } from '@shambit/shared';

const logger = createLogger('image-optimization');

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface OptimizedImage {
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageVariants {
  original: OptimizedImage;
  desktop?: OptimizedImage;
  mobile?: OptimizedImage;
  thumbnail?: OptimizedImage;
}

class ImageOptimizationService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generate optimized image variants for banners
   */
  async generateBannerVariants(
    buffer: Buffer,
    filename: string
  ): Promise<ImageVariants> {
    await this.ensureUploadDir();

    const baseFilename = this.sanitizeFilename(path.parse(filename).name);
    const variants: ImageVariants = {} as ImageVariants;

    try {
      // Original (WebP, high quality)
      const originalPath = path.join(this.uploadDir, `${baseFilename}-original.webp`);
      const originalInfo = await sharp(buffer)
        .webp({ quality: 90 })
        .toFile(originalPath);

      variants.original = {
        url: `/uploads/${baseFilename}-original.webp`,
        width: originalInfo.width,
        height: originalInfo.height,
        format: 'webp',
        size: originalInfo.size,
      };

      // Desktop variant (1920x600, WebP)
      const desktopPath = path.join(this.uploadDir, `${baseFilename}-desktop.webp`);
      const desktopInfo = await sharp(buffer)
        .resize(1920, 600, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(desktopPath);

      variants.desktop = {
        url: `/uploads/${baseFilename}-desktop.webp`,
        width: desktopInfo.width,
        height: desktopInfo.height,
        format: 'webp',
        size: desktopInfo.size,
      };

      // Mobile variant (800x400, WebP)
      const mobilePath = path.join(this.uploadDir, `${baseFilename}-mobile.webp`);
      const mobileInfo = await sharp(buffer)
        .resize(800, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toFile(mobilePath);

      variants.mobile = {
        url: `/uploads/${baseFilename}-mobile.webp`,
        width: mobileInfo.width,
        height: mobileInfo.height,
        format: 'webp',
        size: mobileInfo.size,
      };

      // Thumbnail (300x150, WebP)
      const thumbnailPath = path.join(this.uploadDir, `${baseFilename}-thumb.webp`);
      const thumbnailInfo = await sharp(buffer)
        .resize(300, 150, { fit: 'cover', position: 'center' })
        .webp({ quality: 75 })
        .toFile(thumbnailPath);

      variants.thumbnail = {
        url: `/uploads/${baseFilename}-thumb.webp`,
        width: thumbnailInfo.width,
        height: thumbnailInfo.height,
        format: 'webp',
        size: thumbnailInfo.size,
      };

      logger.info('Generated banner image variants', {
        baseFilename,
        variants: Object.keys(variants),
      });

      return variants;
    } catch (error) {
      logger.error('Failed to generate image variants', { error, filename });
      throw new AppError(
        'Failed to optimize image',
        500,
        'IMAGE_OPTIMIZATION_FAILED'
      );
    }
  }

  /**
   * Sanitize filename to remove spaces and special characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace other special chars with underscore
      .toLowerCase();
  }

  /**
   * Optimize a single image with custom options
   */
  async optimizeImage(
    buffer: Buffer,
    filename: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    await this.ensureUploadDir();

    const {
      width,
      height,
      quality = 85,
      format = 'webp',
      fit = 'cover',
    } = options;

    const baseFilename = this.sanitizeFilename(path.parse(filename).name);
    const outputFilename = `${baseFilename}-optimized.${format}`;
    const outputPath = path.join(this.uploadDir, outputFilename);

    try {
      let pipeline = sharp(buffer);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit });
      }

      // Apply format-specific optimization
      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
      }

      const info = await pipeline.toFile(outputPath);

      return {
        url: `/uploads/${outputFilename}`,
        width: info.width,
        height: info.height,
        format: info.format,
        size: info.size,
      };
    } catch (error) {
      logger.error('Failed to optimize image', { error, filename, options });
      throw new AppError(
        'Failed to optimize image',
        500,
        'IMAGE_OPTIMIZATION_FAILED'
      );
    }
  }

  /**
   * Validate image file
   */
  async validateImage(buffer: Buffer, options?: { minWidth?: number; minHeight?: number }): Promise<{
    valid: boolean;
    error?: string;
    metadata?: sharp.Metadata;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check if it's a valid image
      if (!metadata.format) {
        return { valid: false, error: 'Invalid image format' };
      }

      // Check supported formats
      const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'svg'];
      if (!supportedFormats.includes(metadata.format)) {
        return {
          valid: false,
          error: `Unsupported format: ${metadata.format}. Supported: ${supportedFormats.join(', ')}`,
        };
      }

      // Check dimensions with configurable minimums (default: 100x100 for product images)
      const minWidth = options?.minWidth ?? 100;
      const minHeight = options?.minHeight ?? 100;
      
      if (metadata.width && metadata.width < minWidth) {
        return { valid: false, error: `Image width must be at least ${minWidth}px` };
      }
      if (metadata.height && metadata.height < minHeight) {
        return { valid: false, error: `Image height must be at least ${minHeight}px` };
      }

      return { valid: true, metadata };
    } catch (error) {
      logger.error('Image validation failed', { error });
      return { valid: false, error: 'Failed to validate image' };
    }
  }

  /**
   * Delete image and its variants
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = path.basename(imageUrl);
      const baseFilename = filename.replace(/-(original|desktop|mobile|thumb|optimized)\.(webp|jpeg|png|jpg)$/, '');

      // Delete all possible variants
      const variants = [
        `${baseFilename}-original.webp`,
        `${baseFilename}-desktop.webp`,
        `${baseFilename}-mobile.webp`,
        `${baseFilename}-thumb.webp`,
        `${baseFilename}-optimized.webp`,
        `${baseFilename}-optimized.jpeg`,
        `${baseFilename}-optimized.png`,
        filename, // Original filename
      ];

      for (const variant of variants) {
        const filePath = path.join(this.uploadDir, variant);
        try {
          await fs.unlink(filePath);
          logger.debug('Deleted image file', { file: variant });
        } catch (error) {
          // File might not exist, ignore error
        }
      }

      logger.info('Deleted image and variants', { imageUrl });
    } catch (error) {
      logger.error('Failed to delete image', { error, imageUrl });
      // Don't throw error, just log it
    }
  }
}

export const imageOptimizationService = new ImageOptimizationService();
