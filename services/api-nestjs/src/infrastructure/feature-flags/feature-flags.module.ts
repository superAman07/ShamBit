import { Module, Global } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagRepository } from './feature-flag.repository';
import { FeatureFlagController } from './feature-flag.controller';

@Global()
@Module({
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, FeatureFlagRepository],
  exports: [FeatureFlagService],
})
export class FeatureFlagsModule {}