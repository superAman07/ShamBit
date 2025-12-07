/**
 * Structured logging utility
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export interface LogContext {
  service?: string;
  requestId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    const logString = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(logString);
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(logString);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(logString);
        break;
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.log(logString);
        break;
    }
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
}

export const createLogger = (serviceName: string): Logger => {
  return new Logger(serviceName);
};
