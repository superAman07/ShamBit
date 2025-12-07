import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

import { createLogger } from '@shambit/shared';

const logger = createLogger('config');

// Load environment variables from workspace root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

/**
 * Environment types
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Configuration schema validation
 */
const configSchema = z.object({
  // Environment
  NODE_ENV: z.nativeEnum(Environment).default(Environment.DEVELOPMENT),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default('5432'),
  DB_NAME: z.string().default('shambit_dev'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // API
  API_VERSION: z.string().default('v1'),
  API_RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'), // 1 minute
  API_RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).default('INFO'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Security
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Firebase Cloud Messaging
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
});

type Config = z.infer<typeof configSchema>;

let config: Config | null = null;

/**
 * Load and validate configuration
 */
export const loadConfig = (): Config => {
  if (config) {
    return config;
  }

  try {
    config = configSchema.parse(process.env);
    logger.info('Configuration loaded successfully', {
      environment: config.NODE_ENV,
      port: config.PORT,
    });
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed', {
        errors: error.errors,
      });
      throw new Error(`Configuration validation failed: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
};

/**
 * Get configuration
 */
export const getConfig = (): Config => {
  if (!config) {
    return loadConfig();
  }
  return config;
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getConfig().NODE_ENV === Environment.PRODUCTION;
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return getConfig().NODE_ENV === Environment.DEVELOPMENT;
};

/**
 * Check if running in test
 */
export const isTest = (): boolean => {
  return getConfig().NODE_ENV === Environment.TEST;
};
