import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '@shambit/shared';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

const router = Router();

// OpenStreetMap Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ShamBit-Admin-Portal/1.0'; // Required by Nominatim usage policy

// Cache TTL: 7 days (addresses don't change frequently)
const CACHE_TTL = 7 * 24 * 60 * 60; // seconds

// Rate limiter to prevent abuse
// Nominatim allows 1 req/sec, so we limit to 30 req/min per IP (well within limits)
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many geocoding requests from this IP, please try again after a minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/v1/location/reverse-geocode
 * @desc    Convert coordinates to address with caching
 * @access  Public
 */
router.get(
  '/reverse-geocode',
  geocodeLimiter, // Apply rate limiting
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        throw new AppError('Latitude and longitude are required', 400, 'VALIDATION_ERROR');
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);

      if (isNaN(lat) || isNaN(lng)) {
        throw new AppError('Invalid latitude or longitude', 400, 'VALIDATION_ERROR');
      }

      // Round coordinates to 4 decimal places (~11m precision) for better cache hits
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLng = Math.round(lng * 10000) / 10000;

      // Fetch from Nominatim (no caching after Redis removal)
      console.log(`[Geocoding] Fetching from Nominatim for ${roundedLat},${roundedLng}`);
      const address = await reverseGeocodeCoordinates(roundedLat, roundedLng);

      res.json({
        success: true,
        data: address,
        source: 'api',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * @param lat Latitude
 * @param lng Longitude
 * @returns Address details
 */
async function reverseGeocodeCoordinates(lat: number, lng: number) {
  try {
    // Call Nominatim reverse geocoding API
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
        zoom: 18, // Higher zoom for more detailed address
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 5000, // 5 second timeout
    });

    const data = response.data;

    if (!data || data.error) {
      throw new Error(data?.error || 'Unable to geocode location');
    }

    // Extract address components from Nominatim response
    const addressComponents = data.address || {};

    // Build address string from components
    const addressParts = [];

    // Add road/street
    if (addressComponents.road) {
      addressParts.push(addressComponents.road);
    } else if (addressComponents.neighbourhood) {
      addressParts.push(addressComponents.neighbourhood);
    }

    // Add suburb/area
    const area = addressComponents.suburb ||
      addressComponents.neighbourhood ||
      addressComponents.quarter ||
      addressComponents.village ||
      '';

    if (area && !addressParts.includes(area)) {
      addressParts.push(area);
    }

    // Add city
    const city = addressComponents.city ||
      addressComponents.town ||
      addressComponents.municipality ||
      addressComponents.county ||
      'Unknown City';

    // Add state
    const state = addressComponents.state ||
      addressComponents.state_district ||
      'Unknown State';

    // Extract pincode/postcode
    const pincode = addressComponents.postcode || '000000';

    // Build full address
    const fullAddress = addressParts.length > 0
      ? `${addressParts.join(', ')}, ${city}`
      : `${city}, ${state}`;

    return {
      address: fullAddress,
      city,
      state,
      pincode,
      area: area || addressParts[0] || 'Unknown Area',
    };
  } catch (error: any) {
    console.error('[Geocoding] Nominatim error:', error.message);

    // Re-throw AppError instances directly (preserve error details)
    if (error instanceof AppError) {
      throw error;
    }

    // Handle specific axios errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new AppError('Geocoding service timeout. Please try again.', 504, 'GEOCODING_TIMEOUT');
    }

    if (error.response?.status === 429) {
      throw new AppError('Too many requests to geocoding service. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Wrap unknown errors in a generic AppError
    throw new AppError('Unable to determine address from location', 500, 'GEOCODING_ERROR');
  }
}

export default router;