import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('image-processing')
export class ImageProcessingWorker {
  @Process('resize')
  async handleImageResize(job: Job) {
    // TODO: Implement image resizing
    console.log('Processing image resize job:', job.data);
  }

  @Process('optimize')
  async handleImageOptimization(job: Job) {
    // TODO: Implement image optimization
    console.log('Processing image optimization job:', job.data);
  }
}