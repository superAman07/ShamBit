import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('search-index')
export class SearchIndexWorker {
  @Process('index-product')
  async handleIndexProduct(job: Job) {
    // TODO: Implement product indexing
    console.log('Processing index product job:', job.data);
  }

  @Process('remove-from-index')
  async handleRemoveFromIndex(job: Job) {
    // TODO: Implement removal from search index
    console.log('Processing remove from index job:', job.data);
  }
}