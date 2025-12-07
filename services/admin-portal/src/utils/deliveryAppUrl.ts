/**
 * Utility function to get the delivery app URL dynamically
 * This handles different deployment scenarios:
 * - Development: localhost with specific port
 * - Production: same hostname as admin portal with delivery app port
 * - Network deployment: IP address with delivery app port
 */
export const getDeliveryAppUrl = (): string => {
  const protocol = window.location.protocol;
  const currentHostname = window.location.hostname;
  
  // Get configuration from environment variables
  const deliveryAppHost = import.meta.env.VITE_DELIVERY_APP_HOST;
  const deliveryAppPort = import.meta.env.VITE_DELIVERY_APP_PORT || '5174';
  
  // If specific host is configured, use it
  if (deliveryAppHost && deliveryAppHost.trim() !== '') {
    return `${protocol}//${deliveryAppHost}:${deliveryAppPort}`;
  }
  
  // Auto-detect based on current environment
  if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
    // Development environment
    return `${protocol}//localhost:${deliveryAppPort}`;
  } else {
    // Production or network environment - use current hostname
    return `${protocol}//${currentHostname}:${deliveryAppPort}`;
  }
};

/**
 * Get the delivery app login URL
 */
export const getDeliveryAppLoginUrl = (): string => {
  return `${getDeliveryAppUrl()}/login`;
};

/**
 * Get display-friendly delivery app URL for instructions
 */
export const getDeliveryAppDisplayUrl = (): string => {
  const url = getDeliveryAppUrl();
  
  // If it's a long URL, we might want to show just the essential parts
  // For now, return the full URL
  return url;
};