export class SettlementTransaction {
  id: string;
  settlementId: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: string;
  createdAt: Date;

  constructor(data: Partial<SettlementTransaction>) {
    Object.assign(this, data);
  }
}