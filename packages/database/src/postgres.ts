import knex, { Knex } from 'knex';

import { createLogger } from '@shambit/shared';

const logger = createLogger('database');

let db: Knex | null = null;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolMin?: number;
  poolMax?: number;
}

/**
 * Initialize PostgreSQL connection with enhanced connection pooling
 */
export const initializeDatabase = (config: DatabaseConfig): Knex => {
  if (db) {
    logger.warn('Database already initialized');
    return db;
  }

  try {
    db = knex({
      client: 'postgresql',
      connection: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        // Enhanced connection settings for performance
        application_name: 'shambit-api',
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000,
        connectionTimeoutMillis: 10000,
      },
      pool: {
        min: config.poolMin || 5, // Increased minimum connections
        max: config.poolMax || 20, // Increased maximum connections
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000, // 5 minutes
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        // Connection lifecycle hooks
        afterCreate: (connection: any, done: any) => {
          // Set connection-level optimizations
          connection.query('SET statement_timeout = 30000', (err: any) => {
            if (err) {
              logger.warn('Failed to set statement timeout', { error: err.message });
            }
            connection.query('SET lock_timeout = 10000', (err2: any) => {
              if (err2) {
                logger.warn('Failed to set lock timeout', { error: err2.message });
              }
              done(err || err2, connection);
            });
          });
        },
      },
      acquireConnectionTimeout: 10000,
      // Enhanced debugging and logging
      debug: process.env.NODE_ENV === 'development',
      log: {
        warn(message: string) {
          logger.warn('Database warning', { message });
        },
        error(message: string) {
          logger.error('Database error', { message });
        },
        deprecate(message: string) {
          logger.warn('Database deprecation', { message });
        },
        debug(message: string) {
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Database debug', { message });
          }
        },
      },
    });

    // Set up connection pool event listeners
    const pool = (db.client as any).pool;
    if (pool) {
      pool.on('createSuccess', () => {
        logger.debug('Database connection created');
      });

      pool.on('createFail', (err: Error) => {
        logger.error('Database connection creation failed', { error: err.message });
      });

      pool.on('destroySuccess', () => {
        logger.debug('Database connection destroyed');
      });

      pool.on('acquireRequest', () => {
        logger.debug('Database connection acquire requested');
      });

      pool.on('acquireSuccess', () => {
        logger.debug('Database connection acquired');
      });

      pool.on('acquireFail', (err: Error) => {
        logger.error('Database connection acquire failed', { error: err.message });
      });

      pool.on('release', () => {
        logger.debug('Database connection released');
      });
    }

    logger.info('Database connection initialized with enhanced pooling', {
      host: config.host,
      database: config.database,
      poolMin: config.poolMin || 5,
      poolMax: config.poolMax || 20,
    });

    return db;
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Get the database instance
 */
export const getDatabase = (): Knex => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
    db = null;
    logger.info('Database connection closed');
  }
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    await database.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};
