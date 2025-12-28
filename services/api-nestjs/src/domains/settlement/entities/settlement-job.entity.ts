export class SettlementJob {
  id: string;
  settlementId: string;
  jobType: string;
  status: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<SettlementJob>) {
    Object.assign(this, data);
  }
}