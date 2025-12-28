import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { BannerRepository } from './banner.repository';
import { CampaignService } from './campaign.service';
import { CampaignRepository } from './campaign.repository';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [BannerController],
  providers: [
    BannerService,
    BannerRepository,
    CampaignService,
    CampaignRepository,
  ],
  exports: [BannerService, CampaignService],
})
export class BannerModule {}