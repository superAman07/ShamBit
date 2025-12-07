import { initializeDatabase, closeDatabase } from '@shambit/database';
import { loadConfig } from '@shambit/config';
import { createLogger } from '@shambit/shared';
import { inventoryService } from '../services/inventory.service';

const logger = createLogger('cleanup-reservations-job');

/**
 * Background job to clean up expired inventory reservations
 * Should be run periodically (e.g., every 5 minutes via cron)
 */
async function cleanupExpiredReservations(): Promise<void> {
  try {
    logger.info('Starting cleanup job');

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

    // Run cleanup
    const cleanedCount = await inventoryService.cleanupExpiredReservations();

    logger.info('Cleanup job completed', { cleanedCount });

    // Close connections
    await closeDatabase();

    process.exit(0);
  } catch (error) {
    logger.error('Cleanup job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Run the job
void cleanupExpiredReservations();
