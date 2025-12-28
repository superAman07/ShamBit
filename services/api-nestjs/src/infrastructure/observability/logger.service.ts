import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  log(message: string, context?: any) {
    super.log(JSON.stringify({ message, context }));
  }

  error(message: string, trace?: string, context?: any) {
    super.error(JSON.stringify({ message, context }), trace);
  }

  warn(message: string, context?: any) {
    super.warn(JSON.stringify({ message, context }));
  }

  debug(message: string, context?: any) {
    super.debug(JSON.stringify({ message, context }));
  }

  verbose(message: string, context?: any) {
    super.verbose(JSON.stringify({ message, context }));
  }
}