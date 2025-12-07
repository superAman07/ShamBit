/**
 * Map Configuration
 * Centralized configuration for map providers
 */

export interface MapConfig {
  provider: 'leaflet' | 'google';
  apiKey?: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  tileLayer?: {
    url: string;
    attribution: string;
  };
}

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;

export const mapConfig: MapConfig = {
  // Use Leaflet for development, Google Maps for production
  provider: isDevelopment ? 'leaflet' : 'google',
  
  // Google Maps API key (only needed for production)
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  
  // Default map center (Delhi, India)
  defaultCenter: [28.6139, 77.2090],
  defaultZoom: 10,
  
  // Leaflet tile layer configuration
  tileLayer: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
};

// Geocoding service configuration
export const geocodingConfig = {
  // Use different geocoding services based on map provider
  provider: mapConfig.provider === 'google' ? 'google' : 'nominatim',
  
  // Nominatim (OpenStreetMap) for development
  nominatim: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    searchEndpoint: '/search',
    reverseEndpoint: '/reverse'
  },
  
  // Google Geocoding API for production
  google: {
    baseUrl: 'https://maps.googleapis.com/maps/api/geocode',
    apiKey: mapConfig.apiKey
  }
};

// Map style configurations
export const mapStyles = {
  leaflet: {
    // Different tile layer options for Leaflet
    openStreetMap: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    }
  },
  google: {
    // Google Maps style options
    roadmap: 'roadmap',
    satellite: 'satellite',
    hybrid: 'hybrid',
    terrain: 'terrain'
  }
};

export default mapConfig;