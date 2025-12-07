import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getConfig } from '@shambit/config';

const config = getConfig();

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${level}] [${service || 'api'}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

/**
 * Create Winston logger instance with daily log rotation
 */
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'shambit-api',
    environment: config.NODE_ENV,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    // Daily rotating file transport for errors
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '7d', // Keep 7 days
      zippedArchive: true,
    }),
    // Daily rotating file transport for all logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d', // Keep 7 days
      zippedArchive: true,
    }),
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

/**
 * Create child logger with additional context
 */
export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Log levels:
 * - error: Application errors, exceptions
 * - warn: Potential issues, deprecated usage
 * - info: Important business events
 * - http: HTTP request logs
 * - debug: Detailed diagnostic information
 */
