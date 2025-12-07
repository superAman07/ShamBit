/**
 * Error Tracking and Reporting Utility
 * Provides structured error logging and tracking for the admin portal
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  [key: string]: any;
}

interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'RUNTIME_ERROR' | 'UNKNOWN';
}

class ErrorTracker {
  private errors: TrackedError[] = [];
  private readonly maxErrors = 100;

  /**
   * Track an error with context
   */
  track(
    error: Error | any,
    context: Partial<ErrorContext> = {},
    severity: TrackedError['severity'] = 'medium'
  ): void {
    const trackedError: TrackedError = {
      id: this.generateErrorId(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      severity,
      type: this.categorizeError(error),
    };

    this.errors.push(trackedError);

    // Keep only the last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console based on severity
    this.logError(trackedError);

    // Store in localStorage for debugging
    this.persistError(trackedError);
  }

  /**
   * Track API errors specifically
   */
  trackApiError(
    error: any,
    endpoint: string,
    method: string,
    context: Partial<ErrorContext> = {}
  ): void {
    const statusCode = error.response?.status;
    const severity = this.getSeverityFromStatusCode(statusCode);

    this.track(error, {
      ...context,
      endpoint,
      method,
      statusCode,
      responseData: error.response?.data,
    }, severity);
  }

  /**
   * Get all tracked errors
   */
  getErrors(): TrackedError[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: TrackedError['severity']): TrackedError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: TrackedError['type']): TrackedError[] {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * Clear all tracked errors
   */
  clear(): void {
    this.errors = [];
    localStorage.removeItem('admin_portal_errors');
  }

  /**
   * Export errors for debugging
   */
  export(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: any): TrackedError['type'] {
    if (error.response) {
      return 'API_ERROR';
    }
    if (error.request) {
      return 'NETWORK_ERROR';
    }
    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }
    if (error instanceof Error) {
      return 'RUNTIME_ERROR';
    }
    return 'UNKNOWN';
  }

  /**
   * Get severity from HTTP status code
   */
  private getSeverityFromStatusCode(statusCode?: number): TrackedError['severity'] {
    if (!statusCode) return 'medium';
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400 && statusCode < 500) return 'low';
    return 'medium';
  }

  /**
   * Log error to console with appropriate level
   */
  private logError(error: TrackedError): void {
    const logData = {
      id: error.id,
      message: error.message,
      type: error.type,
      severity: error.severity,
      context: error.context,
    };

    switch (error.severity) {
      case 'critical':
      case 'high':
        console.error('[ErrorTracker]', logData);
        break;
      case 'medium':
        console.warn('[ErrorTracker]', logData);
        break;
      case 'low':
        console.info('[ErrorTracker]', logData);
        break;
    }
  }

  /**
   * Persist error to localStorage
   */
  private persistError(error: TrackedError): void {
    try {
      const stored = localStorage.getItem('admin_portal_errors');
      const errors = stored ? JSON.parse(stored) : [];
      errors.push({
        id: error.id,
        message: error.message,
        type: error.type,
        severity: error.severity,
        timestamp: error.context.timestamp,
      });

      // Keep only last 50 errors in localStorage
      if (errors.length > 50) {
        errors.shift();
      }

      localStorage.setItem('admin_portal_errors', JSON.stringify(errors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
}

export const errorTracker = new ErrorTracker();

/**
 * Global error handler for unhandled errors
 */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorTracker.track(event.error, {
      component: 'Global',
      action: 'unhandledError',
    }, 'high');
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.track(event.reason, {
      component: 'Global',
      action: 'unhandledRejection',
    }, 'high');
  });
}
