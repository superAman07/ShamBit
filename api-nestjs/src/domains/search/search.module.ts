import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexService } from './search-index.service';
import { FilterService } from './filter.service';
import { AnalyticsService } from './analytics.service';
import { PopularityService } from './popularity.service';
import { SearchEventHandler } from './events/search-event.handler';
import { ProductModule } from '../product/product.module';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Module({
  imports: [
    ProductModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchIndexService,
    FilterService,
    AnalyticsService,
    PopularityService,
    SearchEventHandler,
    CacheService,
  ],
  exports: [
    SearchService,
    SearchIndexService,
    FilterService,
    AnalyticsService,
    PopularityService,
  ],
})
export class SearchModule {}
