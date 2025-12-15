// API Configuration
const getApiBaseUrl = () => {
  // In development, detect if we're accessing via network IP
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    
    // If accessing via network IP, use the same IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3000/api/v1`;
    }
    
    // Default to localhost for local development
    return 'http://localhost:3000/api/v1';
  }
  
  // In production, use relative URLs or environment variable
  return import.meta.env.VITE_API_URL || '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  SELLERS: {
    REGISTER: `${API_BASE_URL}/sellers/register`,
    LIST: `${API_BASE_URL}/sellers`,
    STATISTICS: `${API_BASE_URL}/sellers/statistics/overview`,
  },
  HEALTH: `${API_BASE_URL.replace('/api/v1', '')}/health`,
} as const;