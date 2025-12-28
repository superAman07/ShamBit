import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Status' })
  getStatus() {
    return {
      message: 'ShamBit NestJS API is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health Check' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}