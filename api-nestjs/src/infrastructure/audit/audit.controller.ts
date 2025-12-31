import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/types';
import type { PaginationQuery } from '../../common/types';

@ApiTags('Audit & Compliance')
@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @Query()
    query: PaginationQuery & {
      entityType?: string;
      entityId?: string;
      action?: string;
      actorId?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    return this.auditService.getAuditLogs(query);
  }

  @Get('logs/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit log by ID' })
  async getAuditLog(@Param('id') id: string) {
    return this.auditService.getAuditLog(id);
  }

  @Get('entity/:type/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get entity audit trail' })
  async getEntityAuditTrail(
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.auditService.getEntityAuditTrail(entityType, entityId, query);
  }

  @Post('export')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export audit data' })
  async exportAuditData(
    @Body()
    body: {
      entityType?: string;
      fromDate?: string;
      toDate?: string;
      format?: 'csv' | 'json';
    },
  ) {
    return this.auditService.exportAuditData(body);
  }

  @Get('compliance/gdpr/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'GDPR data export' })
  async gdprDataExport(@Param('userId') userId: string) {
    return this.auditService.gdprDataExport(userId);
  }

  @Delete('compliance/gdpr/:userId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GDPR data deletion' })
  async gdprDataDeletion(@Param('userId') userId: string) {
    return this.auditService.gdprDataDeletion(userId);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit statistics' })
  async getAuditStats(@Query() query: { fromDate?: string; toDate?: string }) {
    return this.auditService.getAuditStats(query);
  }
}
