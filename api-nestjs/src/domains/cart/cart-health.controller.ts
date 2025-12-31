import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Cart Health')
@Controller('cart/health')
export class CartHealthController {
  @Get()
  @ApiOperation({ summary: 'Check cart system health' })
  @ApiResponse({ status: 200, description: 'Cart system is healthy' })
  getHealth() {
    return {
      status: 'healthy',
      service: 'cart',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('modules')
  @ApiOperation({ summary: 'Check cart module dependencies' })
  @ApiResponse({ status: 200, description: 'Cart module dependencies status' })
  getModuleStatus() {
    return {
      modules: {
        cart: 'loaded',
        pricing: 'loaded',
        cache: 'loaded',
        analytics: 'loaded',
        promotions: 'loaded',
        inventory: 'loaded',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
