/**
 * Geocoding Service
 * Handles address to coordinates conversion and reverse geocoding
 * Supports both Nominatim (development) and Google Maps (production)
 */

import { geocodingConfig } from '../config/maps';

export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ReverseGeocodingResult {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

class GeocodingService {
  /**
   * Search for coordinates by address
   */
  async searchAddress(query: string): Promise<GeocodingResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      if (geocodingConfig.provider === 'google') {
        return await this.searchWithGoogle(query);
      } else {
        return await this.searchWithNominatim(query);
      }
    } catch (error) {
      console.error('Geocoding search error:', error);
      throw new Error('Failed to search address');
    }
  }

  /**
   * Get address from coordinates (reverse geocoding)
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
    try {
      if (geocodingConfig.provider === 'google') {
        return await this.reverseGeocodeWithGoogle(lat, lng);
      } else {
        return await this.reverseGeocodeWithNominatim(lat, lng);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search using Nominatim (OpenStreetMap)
   */
  private async searchWithNominatim(query: string): Promise<GeocodingResult[]> {
    const { nominatim } = geocodingConfig;
    const url = `${nominatim.baseUrl}${nominatim.searchEndpoint}?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Nominatim search failed');
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name,
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state,
      country: item.address?.country,
      postalCode: item.address?.postcode,
    }));
  }

  /**
   * Search using Google Geocoding API
   */
  private async searchWithGoogle(query: string): Promise<GeocodingResult[]> {
    const { google } = geocodingConfig;
    if (!google.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `${google.baseUrl}/json?address=${encodeURIComponent(query)}&key=${google.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Google Geocoding API request failed');
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Geocoding API error: ${data.status}`);
    }

    return data.results.map((item: any) => {
      const addressComponents = item.address_components;
      
      return {
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        address: item.formatted_address,
        city: this.extractAddressComponent(addressComponents, 'locality'),
        state: this.extractAddressComponent(addressComponents, 'administrative_area_level_1'),
        country: this.extractAddressComponent(addressComponents, 'country'),
        postalCode: this.extractAddressComponent(addressComponents, 'postal_code'),
      };
    });
  }

  /**
   * Reverse geocode using Nominatim
   */
  private async reverseGeocodeWithNominatim(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
    const { nominatim } = geocodingConfig;
    const url = `${nominatim.baseUrl}${nominatim.reverseEndpoint}?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Nominatim reverse geocoding failed');
    }

    const data = await response.json();
    
    if (!data || !data.address) {
      return null;
    }

    return {
      address: data.display_name,
      city: data.address.city || data.address.town || data.address.village,
      state: data.address.state,
      country: data.address.country,
      postalCode: data.address.postcode,
    };
  }

  /**
   * Reverse geocode using Google Geocoding API
   */
  private async reverseGeocodeWithGoogle(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
    const { google } = geocodingConfig;
    if (!google.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `${google.baseUrl}/json?latlng=${lat},${lng}&key=${google.apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Google Geocoding API request failed');
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results.length) {
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components;

    return {
      address: result.formatted_address,
      city: this.extractAddressComponent(addressComponents, 'locality'),
      state: this.extractAddressComponent(addressComponents, 'administrative_area_level_1'),
      country: this.extractAddressComponent(addressComponents, 'country'),
      postalCode: this.extractAddressComponent(addressComponents, 'postal_code'),
    };
  }

  /**
   * Extract specific component from Google Maps address components
   */
  private extractAddressComponent(components: any[], type: string): string | undefined {
    const component = components.find(comp => comp.types.includes(type));
    return component?.long_name;
  }

  /**
   * Get current location using browser geolocation
   */
  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;