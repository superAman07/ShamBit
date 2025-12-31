import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'ShamBit NestJS API is running!';
  }

  getVersion() {
    return {
      name: 'ShamBit API',
      version: '1.0.0',
      description: 'ShamBit Quick Commerce Platform API',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
