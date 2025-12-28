import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';

@Processor('notifications')
export class NotificationWorker {
  @Process('send-email')
  async handleSendEmail(job: Job) {
    // TODO: Implement email sending
    console.log('Processing send email job:', job.data);
  }

  @Process('send-push')
  async handleSendPush(job: Job) {
    // TODO: Implement push notification sending
    console.log('Processing send push job:', job.data);
  }
}
