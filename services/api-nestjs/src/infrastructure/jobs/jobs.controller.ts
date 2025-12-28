import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JobService } from './job.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Background Jobs')
@Controller('jobs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class JobsController {
  constructor(private readonly jobService: JobService) {}

  @Get('queues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    return this.jobService.getQueueStats();
  }

  @Post('retry/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed job' })
  async retryJob(@Param('id') jobId: string) {
    return this.jobService.retryFailedJob(jobId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel job' })
  async cancelJob(@Param('id') jobId: string) {
    await this.jobService.cancelJob(jobId);
  }

  @Get('failed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get failed jobs' })
  async getFailedJobs(@Query() query: PaginationQuery & { queue?: string }) {
    return this.jobService.getFailedJobs(query);
  }

  @Post('cleanup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup completed jobs' })
  async cleanupJobs() {
    return this.jobService.cleanupCompletedJobs();
  }

  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active jobs' })
  async getActiveJobs(@Query() query: PaginationQuery & { queue?: string }) {
    return this.jobService.getActiveJobs(query);
  }

  @Get('waiting')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get waiting jobs' })
  async getWaitingJobs(@Query() query: PaginationQuery & { queue?: string }) {
    return this.jobService.getWaitingJobs(query);
  }
}