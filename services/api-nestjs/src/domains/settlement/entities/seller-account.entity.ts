export class SellerAccount {
  id: string;
  sellerId: string;
  accountId: string;
  accountNumber: string;
  bankName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<SellerAccount>) {
    Object.assign(this, data);
  }

  getBankAccountSnapshot() {
    return {
      accountNumber: this.accountNumber,
      bankName: this.bankName,
      status: this.status,
    };
  }
}