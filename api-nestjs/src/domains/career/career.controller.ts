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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JobService } from './services/job.service';
import { ApplicationService } from './services/application.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser, Public } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Career & Jobs')
@Controller('jobs')
export class CareerController {
  constructor(
    private readonly jobService: JobService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active jobs' })
  async getActiveJobs(
    @Query()
    query: PaginationQuery & { department?: string; location?: string },
  ) {
    return this.jobService.getActiveJobs(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get job details' })
  async getJob(@Param('id') id: string) {
    return this.jobService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create job posting' })
  async createJob(
    @Body() createJobDto: any,
    @CurrentUser('id') postedBy: string,
  ) {
    return this.jobService.createJob(createJobDto, postedBy);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job posting' })
  async updateJob(@Param('id') id: string, @Body() updateJobDto: any) {
    return this.jobService.updateJob(id, updateJobDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete job posting' })
  async deleteJob(@Param('id') id: string) {
    await this.jobService.deleteJob(id);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply for job' })
  async applyForJob(
    @Param('id') jobId: string,
    @Body() applicationDto: any,
    @CurrentUser('id') userId?: string,
  ) {
    return this.applicationService.createApplication(
      jobId,
      applicationDto,
      userId,
    );
  }

  @Get('applications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job applications' })
  async getApplications(
    @Query() query: PaginationQuery & { jobId?: string; status?: string },
  ) {
    return this.applicationService.findAll(query);
  }

  @Get('applications/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application details' })
  async getApplication(@Param('id') id: string) {
    return this.applicationService.findById(id);
  }

  @Put('applications/:id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status' })
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
    @CurrentUser('id') reviewedBy: string,
  ) {
    return this.applicationService.updateStatus(
      id,
      body.status,
      reviewedBy,
      body.notes,
    );
  }
}
