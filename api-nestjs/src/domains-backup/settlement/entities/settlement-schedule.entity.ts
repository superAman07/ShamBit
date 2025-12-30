export class SettlementSchedule {
  id: string;
  sellerId: string;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  holdDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<SettlementSchedule>) {
    Object.assign(this, data);
  }
}