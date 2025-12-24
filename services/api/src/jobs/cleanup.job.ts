import { getDatabase } from '@shambit/database';
import { SellerRegistrationService } from '@shambit/database';

/**
 * Cleanup job for expired records
 * Should run every minute for security (password hash cleanup)
 */
export class CleanupJob {
  private registrationService: SellerRegistrationService | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Don't initialize services in constructor - wait for database to be ready
  }

  /**
   * Initialize the cleanup job services
   */
  private initializeServices(): void {
    if (!this.registrationService) {
      try {
        const db = getDatabase();
        // Import OTP service dynamically to avoid initialization issues
        const { otpService } = require('../services');
        this.registrationService = new SellerRegistrationService(db, otpService);
      } catch (error) {
        console.error('Failed to initialize cleanup job services:', error);
        throw error;
      }
    }
  }

  /**
   * Run cleanup of expired records
   */
  async run(): Promise<void> {
    try {
      // Initialize services if not already done
      this.initializeServices();
      
      if (!this.registrationService) {
        console.error('Cleanup job: Registration service not available');
        return;
      }

      console.log('Running cleanup job...');
      await this.registrationService.cleanupExpiredRecords();
      console.log('Cleanup job completed successfully');
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  }

  /**
   * Start the cleanup job with cron schedule
   */
  start(): void {
    try {
      // Don't initialize services immediately - wait a bit for database to be fully ready
      setTimeout(() => {
        try {
          this.initializeServices();
          
          // Run immediately after initialization
          this.run();

          // Run every minute for security (password hash cleanup)
          this.intervalId = setInterval(() => {
            this.run();
          }, 60 * 1000); // 1 minute

          console.log('Cleanup job started - running every minute');
        } catch (error) {
          console.error('Failed to initialize cleanup job after delay:', error);
        }
      }, 2000); // Wait 2 seconds for database to be fully ready

    } catch (error) {
      console.error('Failed to start cleanup job:', error);
    }
  }

  /**
   * Stop the cleanup job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Cleanup job stopped');
    }
  }
}

export const cleanupJob = new CleanupJob();