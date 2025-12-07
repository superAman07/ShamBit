/**
 * Logging Utility
 * Centralized logging for production-safe error handling
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = import.meta.env.DEV

  /**
   * Log an error message
   * In production, this would send to a monitoring service (e.g., Sentry)
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context)
    } else {
      // In production, send to monitoring service
      this.sendToMonitoring(entry)
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context)
    } else {
      this.sendToMonitoring(entry)
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context)
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context)
    }
  }

  /**
   * Send log entry to monitoring service
   * In production, integrate with Sentry, LogRocket, or similar
   */
  private sendToMonitoring(entry: LogEntry): void {
    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(entry.error, { extra: entry.context })
    
    // For now, store in sessionStorage for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]')
      logs.push(entry)
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift()
      }
      sessionStorage.setItem('app_logs', JSON.stringify(logs))
    } catch (e) {
      // Silently fail if storage is full
    }
  }

  /**
   * Get stored logs (for debugging)
   */
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear stored logs
   */
  clearLogs(): void {
    sessionStorage.removeItem('app_logs')
  }
}

export const logger = new Logger()
