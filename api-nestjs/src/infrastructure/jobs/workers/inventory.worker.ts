import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';

@Processor('inventory')
export class InventoryWorker {
  @Process('update-stock')
  async handleUpdateStock(job: Job) {
    // TODO: Implement stock update
    console.log('Processing update stock job:', job.data);
  }

  @Process('release-reservation')
  async handleReleaseReservation(job: Job) {
    // TODO: Implement reservation release
    console.log('Processing release reservation job:', job.data);
  }
}
