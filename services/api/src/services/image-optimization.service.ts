import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

interface ValidationOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface OptimizedImage {
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

interface BannerVariant {
  type: 'desktop' | 'mobile' | 'thumbnail';
  url: string;
  width: number;
  height: number;
  size: number;
}

class ImageOptimizationService {
  /**
   * Validate image buffer
   */
  async validateImage(
    imageBuffer: Buffer,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      const {
        minWidth = 50,
        minHeight = 50,
        maxWidth = 4000,
        maxHeight = 4000
      } = options;

      if (!metadata.width || !metadata.height) {
        return { valid: false, error: 'Unable to determine image dimensions' };
      }

      if (metadata.width < minWidth || metadata.height < minHeight) {
        return { 
          valid: false, 
          error: `Image too small. Minimum size: ${minWidth}x${minHeight}px` 
        };
      }

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        return { 
          valid: false, 
          error: `Image too large. Maximum size: ${maxWidth}x${maxHeight}px` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid image format' };
    }
  }

  /**
   * Optimize an image buffer and return optimized result
   */
  async optimizeImage(
    imageBuffer: Buffer,
    originalName: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const {
      width,
      height,
      quality = 80,
      format = 'webp'
    } = options;

    let pipeline = sharp(imageBuffer);

    // Resize if dimensions provided
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert and optimize based on format
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: Math.round(quality / 10), compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    const optimizedBuffer = await pipeline.toBuffer();
    const metadata = await sharp(optimizedBuffer).metadata();

    // In a real implementation, you would upload to cloud storage
    // For now, we'll simulate a URL
    const timestamp = Date.now();
    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = `${path.parse(originalName).name}-${timestamp}.${ext}`;
    const url = `/uploads/images/${filename}`;

    return {
      url,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format,
      size: optimizedBuffer.length
    };
  }

  /**
   * Generate banner variants for different screen sizes
   */
  async generateBannerVariants(
    imageBuffer: Buffer,
    originalName: string
  ): Promise<BannerVariant[]> {
    const variants: BannerVariant[] = [];
    const timestamp = Date.now();
    const baseName = path.parse(originalName).name;

    // Desktop variant (1200x400)
    const desktopBuffer = await sharp(imageBuffer)
      .resize(1200, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    
    variants.push({
      type: 'desktop',
      url: `/uploads/banners/${baseName}-desktop-${timestamp}.webp`,
      width: 1200,
      height: 400,
      size: desktopBuffer.length
    });

    // Mobile variant (800x300)
    const mobileBuffer = await sharp(imageBuffer)
      .resize(800, 300, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    
    variants.push({
      type: 'mobile',
      url: `/uploads/banners/${baseName}-mobile-${timestamp}.webp`,
      width: 800,
      height: 300,
      size: mobileBuffer.length
    });

    // Thumbnail variant (200x100)
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 100, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
    
    variants.push({
      type: 'thumbnail',
      url: `/uploads/banners/${baseName}-thumb-${timestamp}.webp`,
      width: 200,
      height: 100,
      size: thumbnailBuffer.length
    });

    return variants;
  }

  /**
   * Generate multiple sizes of an image
   */
  async generateThumbnails(
    inputPath: string,
    outputDir: string,
    sizes: { name: string; width: number; height?: number }[]
  ): Promise<string[]> {
    const outputPaths: string[] = [];
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${basename}-${size.name}${ext}`);
      
      await sharp(inputPath)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(outputPath);
        
      outputPaths.push(outputPath);
    }

    return outputPaths;
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imagePath: string): Promise<sharp.Metadata> {
    return await sharp(imagePath).metadata();
  }
}

export const imageOptimizationService = new ImageOptimizationService();
