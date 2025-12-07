import { CorsOptions } from 'cors';
import { getConfig } from '@shambit/config';

/**
 * CORS configuration
 * Configures Cross-Origin Resource Sharing for the API
 */
export const getCorsOptions = (): CorsOptions => {
  const config = getConfig();
  
  // Parse allowed origins from config
  const allowedOrigins = config.CORS_ORIGIN.split(',').map(origin => origin.trim());
  
  return {
    // Origin validation
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow all origins in development
      if (config.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check for wildcard subdomain matching (e.g., *.example.com)
      const wildcardMatch = allowedOrigins.some(allowed => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.substring(2);
          return origin.endsWith(domain);
        }
        return false;
      });
      
      if (wildcardMatch) {
        return callback(null, true);
      }
      
      // Reject origin
      callback(new Error('Not allowed by CORS'));
    },
    
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    
    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'Accept',
      'Origin',
      'Cache-Control',
      'Pragma',
      'Expires',
      'If-None-Match',
      'If-Modified-Since',
    ],
    
    // Exposed headers (accessible to client)
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    
    // Preflight cache duration (24 hours)
    maxAge: 86400,
    
    // Pass the CORS preflight response to the next handler
    preflightContinue: false,
    
    // Provide a status code to use for successful OPTIONS requests
    optionsSuccessStatus: 204,
  };
};
