/**
 * Error Reporting Service - Simplified Placeholder
 * 
 * NOTE: This is a temporary placeholder to prevent import errors.
 * External error reporting has been removed - using console.error instead.
 * 
 * TODO: Remove all references to this service from the codebase.
 */

export const errorReportingService = {
  captureException(error: Error, context?: any): void {
    console.error('Error captured:', error, context);
  },

  getStoredErrors(): any[] {
    return [];
  },

  clearStoredErrors(): void {
    // No-op
  },
};
