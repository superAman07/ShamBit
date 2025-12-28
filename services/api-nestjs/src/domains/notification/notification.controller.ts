import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQuery & { isRead?: boolean },
  ) {
    return this.notificationService.getUserNotifications(userId, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification by ID' })
  async getNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationService.getNotification(id, userId);
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Put('read-all')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationService.deleteNotification(id, userId);
  }

  @Get('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @Put('preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() preferences: Record<string, any>,
  ) {
    return this.notificationService.updatePreferences(userId, preferences);
  }

  @Post('test')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send test notification' })
  async sendTestNotification(
    @Body() body: { userId: string; type: string; message: string },
  ) {
    return this.notificationService.sendTestNotification(body.userId, body.type, body.message);
  }
}