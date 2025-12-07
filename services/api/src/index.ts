import { getConfig, loadConfig } from '@shambit/config';
import { initializeDatabase, closeDatabase, getDatabase } from '@shambit/database';
import { createLogger } from '@shambit/shared';

import { logger as winstonLogger } from './config/logger.config';
import { createApp } from './app';

const logger = createLogger('api');

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Load configuration
    const config = loadConfig();

    // Initialize database
    initializeDatabase({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      poolMin: config.DB_POOL_MIN,
      poolMax: config.DB_POOL_MAX,
    });

    // Create Express app
    const app = createApp();

    // Start server - bind to all interfaces to allow network access
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info('Server started', {
        port: config.PORT,
        host: '0.0.0.0',
        environment: config.NODE_ENV,
        apiVersion: config.API_VERSION,
      });
      winstonLogger.info('Server started successfully', {
        port: config.PORT,
        environment: config.NODE_ENV,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabase();
          logger.info('All connections closed');
          winstonLogger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          winstonLogger.error('Shutdown error', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      void shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      void shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Start the server
void startServer();
