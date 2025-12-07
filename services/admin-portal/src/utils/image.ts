/**
 * Image utility functions
 */

/**
 * Get the full URL for an image
 * Handles both relative and absolute URLs
 */
export const getImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) {
    console.log('[getImageUrl] No image URL provided');
    return '';
  }
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('[getImageUrl] Already full URL:', imageUrl);
    return imageUrl;
  }
  
  // For relative URLs starting with /uploads, convert to full API URL
  if (imageUrl.startsWith('/uploads/')) {
    // Get current hostname
    const currentHost = window.location.hostname;
    
    // Build API server URL
    const apiServerUrl = `http://${currentHost}:3000`;
    const fullUrl = `${apiServerUrl}${imageUrl}`;
    
    console.log('[getImageUrl] Converting relative to full URL:', {
      input: imageUrl,
      currentHost,
      apiServerUrl,
      output: fullUrl
    });
    
    return fullUrl;
  }
  
  // For other relative URLs, return as is (will be proxied in dev mode)
  console.log('[getImageUrl] Returning as-is:', imageUrl);
  return imageUrl;
};

/**
 * Get a placeholder image URL
 */
export const getPlaceholderImage = (width: number = 300, height: number = 300): string => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle" dy=".3em">
        No Image
      </text>
    </svg>
  `)}`;
};