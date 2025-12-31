import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { WebhookService } from './webhook.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/types';
import type { PaginationQuery } from '../../common/types';

@ApiTags('Webhooks & Integrations')
@Controller('webhooks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all webhooks' })
  async getWebhooks(@Query() query: PaginationQuery) {
    return this.webhookService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook by ID' })
  async getWebhook(@Param('id') id: string) {
    return this.webhookService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create webhook' })
  async createWebhook(
    @Body() createWebhookDto: any,
    @CurrentUser('id') createdBy: string,
  ) {
    return this.webhookService.createWebhook(createWebhookDto, createdBy);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update webhook' })
  async updateWebhook(@Param('id') id: string, @Body() updateWebhookDto: any) {
    return this.webhookService.updateWebhook(id, updateWebhookDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(@Param('id') id: string) {
    await this.webhookService.deleteWebhook(id);
  }

  @Post(':id/test')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test webhook' })
  async testWebhook(@Param('id') id: string) {
    return this.webhookService.testWebhook(id);
  }

  @Get(':id/deliveries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook deliveries' })
  async getWebhookDeliveries(
    @Param('id') webhookId: string,
    @Query() query: PaginationQuery & { status?: string },
  ) {
    return this.webhookDeliveryService.getDeliveries(webhookId, query);
  }

  @Post('deliveries/:id/retry')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed webhook delivery' })
  async retryDelivery(@Param('id') deliveryId: string) {
    return this.webhookDeliveryService.retryDelivery(deliveryId);
  }

  @Get('events/types')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available webhook event types' })
  async getEventTypes() {
    return this.webhookService.getAvailableEventTypes();
  }
}
