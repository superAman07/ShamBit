import { apiService } from './api';

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

interface UploadBannerResponse {
  variants: {
    original: ImageVariant;
    desktop: ImageVariant;
    mobile: ImageVariant;
    thumbnail: ImageVariant;
  };
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class UploadService {
  /**
   * Upload banner image with progress tracking and retry logic
   */
  async uploadBanner(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadBannerResponse> {
    // Validate file before upload
    this.validateImageFile(file);

    const formData = new FormData();
    formData.append('image', file);

    const progressCallback = onProgress
      ? (percentage: number) => {
          onProgress({
            loaded: (file.size * percentage) / 100,
            total: file.size,
            percentage,
          });
        }
      : undefined;

    return await apiService.uploadFile<UploadBannerResponse>(
      '/upload/banner',
      formData,
      progressCallback
    );
  }

  /**
   * Upload single image with progress tracking and retry logic
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string }> {
    // Validate file before upload
    this.validateImageFile(file);

    const formData = new FormData();
    formData.append('image', file);

    const progressCallback = onProgress
      ? (percentage: number) => {
          onProgress({
            loaded: (file.size * percentage) / 100,
            total: file.size,
            percentage,
          });
        }
      : undefined;

    return await apiService.uploadFile<{ url: string }>(
      '/upload/image',
      formData,
      progressCallback
    );
  }

  /**
   * Upload multiple images with progress tracking
   */
  async uploadImages(
    files: File[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ images: Array<{ imageUrl: string }> }> {
    // Validate all files before upload
    files.forEach(file => this.validateImageFile(file));

    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const progressCallback = onProgress
      ? (percentage: number) => {
          onProgress({
            loaded: (totalSize * percentage) / 100,
            total: totalSize,
            percentage,
          });
        }
      : undefined;

    return await apiService.uploadFile<{ images: Array<{ imageUrl: string }> }>(
      '/upload/images',
      formData,
      progressCallback
    );
  }

  /**
   * Validate image file before upload
   */
  private validateImageFile(file: File): void {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error(`Invalid file type: ${file.type}. Please select an image file.`);
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File size (${sizeMB}MB) exceeds maximum allowed size of 10MB.`);
    }

    // Check for valid image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      throw new Error(`Invalid file extension. Allowed: ${validExtensions.join(', ')}`);
    }
  }

  /**
   * Check if user is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Estimate upload time based on file size and connection
   */
  estimateUploadTime(fileSize: number): number {
    // Estimate based on average upload speed (assume 1 Mbps = 125 KB/s)
    const averageSpeedKBps = 125; // Conservative estimate
    const fileSizeKB = fileSize / 1024;
    return Math.ceil(fileSizeKB / averageSpeedKBps); // seconds
  }
}

export const uploadService = new UploadService();
