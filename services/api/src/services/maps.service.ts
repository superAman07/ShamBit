import { createLogger, InternalServerError } from '@shambit/shared';
import axios from 'axios';

const logger = createLogger('maps-service');

interface DistanceMatrixResponse {
  rows: {
    elements: {
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      status: string;
    }[];
  }[];
  status: string;
}

interface DirectionsResponse {
  routes: {
    legs: {
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      steps: any[];
    }[];
    overview_polyline: { points: string };
  }[];
  status: string;
}

interface RouteInfo {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  polyline?: string;
}

class MapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('Google Maps API key not configured. Map features will use fallback calculations.');
    }
  }

  /**
   * Calculate distance and duration between two points using Google Maps Distance Matrix API
   */
  async getDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RouteInfo> {
    if (!this.apiKey) {
      // Fallback to Haversine formula if API key not configured
      return this.getFallbackDistance(originLat, originLng, destLat, destLng);
    }

    try {
      const response = await axios.get<DistanceMatrixResponse>(
        `${this.baseUrl}/distancematrix/json`,
        {
          params: {
            origins: `${originLat},${originLng}`,
            destinations: `${destLat},${destLng}`,
            key: this.apiKey,
            mode: 'driving',
          },
          timeout: 5000,
        }
      );

      if (response.data.status !== 'OK') {
        logger.error('Google Maps API error', { status: response.data.status });
        return this.getFallbackDistance(originLat, originLng, destLat, destLng);
      }

      const element = response.data.rows[0]?.elements[0];

      if (!element || element.status !== 'OK') {
        logger.error('Distance calculation failed', { elementStatus: element?.status });
        return this.getFallbackDistance(originLat, originLng, destLat, destLng);
      }

      return {
        distanceMeters: element.distance.value,
        distanceText: element.distance.text,
        durationSeconds: element.duration.value,
        durationText: element.duration.text,
      };
    } catch (error) {
      logger.error('Error calling Google Maps API', { error });
      return this.getFallbackDistance(originLat, originLng, destLat, destLng);
    }
  }

  /**
   * Get route directions between two points using Google Maps Directions API
   */
  async getDirections(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RouteInfo> {
    if (!this.apiKey) {
      return this.getFallbackDistance(originLat, originLng, destLat, destLng);
    }

    try {
      const response = await axios.get<DirectionsResponse>(
        `${this.baseUrl}/directions/json`,
        {
          params: {
            origin: `${originLat},${originLng}`,
            destination: `${destLat},${destLng}`,
            key: this.apiKey,
            mode: 'driving',
          },
          timeout: 5000,
        }
      );

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        logger.error('Google Directions API error', { status: response.data.status });
        return this.getFallbackDistance(originLat, originLng, destLat, destLng);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        distanceMeters: leg.distance.value,
        distanceText: leg.distance.text,
        durationSeconds: leg.duration.value,
        durationText: leg.duration.text,
        polyline: route.overview_polyline.points,
      };
    } catch (error) {
      logger.error('Error calling Google Directions API', { error });
      return this.getFallbackDistance(originLat, originLng, destLat, destLng);
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.apiKey) {
      logger.warn('Cannot geocode address without API key');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
        timeout: 5000,
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        logger.error('Geocoding failed', { status: response.data.status, address });
        return null;
      }

      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } catch (error) {
      logger.error('Error geocoding address', { error, address });
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.apiKey) {
      logger.warn('Cannot reverse geocode without API key');
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
        timeout: 5000,
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        logger.error('Reverse geocoding failed', { status: response.data.status });
        return null;
      }

      return response.data.results[0].formatted_address;
    } catch (error) {
      logger.error('Error reverse geocoding', { error });
      return null;
    }
  }

  /**
   * Fallback distance calculation using Haversine formula
   */
  private getFallbackDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): RouteInfo {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceMeters = Math.round(R * c);
    const distanceKm = distanceMeters / 1000;

    // Estimate duration assuming 30 km/h average speed
    const durationSeconds = Math.round((distanceKm / 30) * 3600);

    return {
      distanceMeters,
      distanceText: `${distanceKm.toFixed(1)} km`,
      durationSeconds,
      durationText: `${Math.round(durationSeconds / 60)} mins`,
    };
  }

  /**
   * Optimize route for multiple waypoints (for future multi-delivery optimization)
   */
  async optimizeRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: { lat: number; lng: number }[]
  ): Promise<{
    optimizedOrder: number[];
    totalDistance: number;
    totalDuration: number;
  } | null> {
    if (!this.apiKey || waypoints.length === 0) {
      return null;
    }

    try {
      const waypointsParam = waypoints
        .map((wp) => `${wp.lat},${wp.lng}`)
        .join('|');

      const response = await axios.get<DirectionsResponse>(
        `${this.baseUrl}/directions/json`,
        {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            waypoints: `optimize:true|${waypointsParam}`,
            key: this.apiKey,
            mode: 'driving',
          },
          timeout: 10000,
        }
      );

      if (response.data.status !== 'OK' || !response.data.routes.length) {
        logger.error('Route optimization failed', { status: response.data.status });
        return null;
      }

      const route = response.data.routes[0];
      let totalDistance = 0;
      let totalDuration = 0;

      route.legs.forEach((leg) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
      });

      // Extract waypoint order from route
      // Note: Google Maps API returns waypoint_order in the response
      const optimizedOrder = (response.data as any).routes[0].waypoint_order || [];

      return {
        optimizedOrder,
        totalDistance,
        totalDuration,
      };
    } catch (error) {
      logger.error('Error optimizing route', { error });
      return null;
    }
  }
}

export const mapsService = new MapsService();
