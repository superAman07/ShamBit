export class Settlement {
  id: string;
  settlementNumber: string;
  sellerId: string;
  sellerAccountId: string;
  status: string;
  amount: number;
  netAmount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Settlement>) {
    Object.assign(this, data);
  }
}