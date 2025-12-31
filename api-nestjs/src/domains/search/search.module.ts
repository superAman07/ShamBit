import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexService } from './search-index.service';
import { FilterService } from './filter.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule],
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService, FilterService],
  exports: [SearchService, SearchIndexService],
})
export class SearchModule {}
