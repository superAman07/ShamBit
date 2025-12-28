import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { MediaService, UploadSignedUrlDto } from './media.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Media')
@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate signed upload URL' })
  async generateUploadUrl(
    @Body() uploadDto: UploadSignedUrlDto,
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.mediaService.generateSignedUploadUrl(uploadDto, uploadedBy);
  }

  @Post(':id/confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm upload completion' })
  async confirmUpload(
    @Param('id') mediaId: string,
    @Body() body: { metadata?: Record<string, any> },
  ) {
    return this.mediaService.confirmUpload(mediaId, body.metadata);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file' })
  async getMedia(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete media file' })
  async deleteMedia(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.mediaService.deleteMedia(id, userId);
  }

  @Post('bulk-upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate bulk upload URLs' })
  async bulkUploadUrls(
    @Body() body: { uploads: UploadSignedUrlDto[] },
    @CurrentUser('id') uploadedBy: string,
  ) {
    return this.mediaService.generateBulkUploadUrls(body.uploads, uploadedBy);
  }

  @Get('processing-status/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check processing status' })
  async getProcessingStatus(@Param('id') mediaId: string) {
    return this.mediaService.getProcessingStatus(mediaId);
  }
}