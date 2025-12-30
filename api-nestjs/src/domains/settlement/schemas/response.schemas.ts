import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base response schemas
export class PaginationMeta {
  @ApiProperty({ description: 'Total number of items', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 50 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPrev: boolean;
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Array of items', type: 'array' })
  data: T[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}

// Settlement response schemas
export class SettlementResponse {
  @ApiProperty({ description: 'Settlement unique identifier', example: 'stl_123456789' })
  id: string;

  @ApiProperty({ description: 'Human-readable settlement ID', example: 'STL-2024-001' })
  settlementId: string;

  @ApiProperty({ description: 'Seller unique identifier', example: 'seller_123' })
  sellerId: string;

  @ApiProperty({ description: 'Seller account ID', example: 'acc_456' })
  sellerAccountId: string;

  @ApiProperty({ 
    description: 'Settlement status', 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    example: 'PENDING'
  })
  status: string;

  @ApiProperty({ description: 'Gross amount before deductions', example: 10000.00 })
  grossAmount: number;

  @ApiProperty({ description: 'Commission amount', example: 500.00 })
  commissionAmount: number;

  @ApiPropertyOptional({ description: 'Platform fee amount', example: 100.00 })
  platformFeeAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount', example: 90.00 })
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Adjustment amount', example: -10.00 })
  adjustmentAmount?: number;

  @ApiProperty({ description: 'Net amount to be paid', example: 9310.00 })
  netAmount: number;

  @ApiProperty({ description: 'Settlement currency', example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Settlement period start', example: '2024-01-01T00:00:00Z' })
  periodStart: string;

  @ApiProperty({ description: 'Settlement period end', example: '2024-01-31T23:59:59Z' })
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Settlement date', example: '2024-02-01T00:00:00Z' })
  settlementDate?: string;

  @ApiPropertyOptional({ description: 'Scheduled processing date', example: '2024-02-01T10:00:00Z' })
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Completion date', example: '2024-02-01T15:30:00Z' })
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Failure date', example: null })
  failedAt?: string;

  @ApiPropertyOptional({ description: 'Failure reason', example: null })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Razorpay payout ID', example: 'pout_12345' })
  razorpayPayoutId?: string;

  @ApiPropertyOptional({ description: 'UTR number', example: 'UTR123456789' })
  utrNumber?: string;

  @ApiPropertyOptional({ description: 'Settlement notes', example: 'Monthly settlement for January 2024' })
  notes?: string;

  @ApiProperty({ description: 'Created by user ID', example: 'user_789' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-02-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-02-01T15:30:00Z' })
  updatedAt: string;
}

// Seller Account response schemas
export class SellerAccountResponse {
  @ApiProperty({ description: 'Account unique identifier', example: 'acc_123456789' })
  id: string;

  @ApiProperty({ description: 'Seller unique identifier', example: 'seller_123' })
  sellerId: string;

  @ApiProperty({ description: 'Account holder name', example: 'John Doe' })
  accountHolderName: string;

  @ApiProperty({ description: 'Masked account number', example: '****7890' })
  accountNumber: string;

  @ApiProperty({ description: 'Bank IFSC code', example: 'HDFC0001234' })
  ifscCode: string;

  @ApiProperty({ description: 'Bank name', example: 'HDFC Bank' })
  bankName: string;

  @ApiPropertyOptional({ description: 'Branch name', example: 'Mumbai Main Branch' })
  branchName?: string;

  @ApiProperty({ description: 'Account type', enum: ['SAVINGS', 'CURRENT'], example: 'SAVINGS' })
  accountType: string;

  @ApiPropertyOptional({ description: 'UPI ID', example: 'john@paytm' })
  upiId?: string;

  @ApiProperty({ 
    description: 'KYC status', 
    enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'],
    example: 'PENDING'
  })
  kycStatus: string;

  @ApiProperty({ 
    description: 'Account status', 
    enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
    example: 'ACTIVE'
  })
  status: string;

  @ApiProperty({ description: 'Is account verified', example: false })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'Verification date', example: null })
  verifiedAt?: string;

  @ApiPropertyOptional({ description: 'Business name', example: 'ABC Private Limited' })
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business type', example: 'INDIVIDUAL' })
  businessType?: string;

  @ApiProperty({ description: 'Has Razorpay integration', example: false })
  hasRazorpayIntegration: boolean;

  @ApiProperty({ description: 'KYC completion percentage', example: 25 })
  completionPercentage: number;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T10:30:00Z' })
  updatedAt: string;
}

// Wallet response schemas
export class WalletBalanceResponse {
  @ApiProperty({ description: 'Available balance for settlement', example: 5000.00 })
  availableBalance: number;

  @ApiProperty({ description: 'Pending balance (clearance pending)', example: 2000.00 })
  pendingBalance: number;

  @ApiProperty({ description: 'Reserved balance (for refunds)', example: 500.00 })
  reservedBalance: number;

  @ApiProperty({ description: 'Total wallet balance', example: 7500.00 })
  totalBalance: number;
}

export class WalletResponse {
  @ApiProperty({ description: 'Wallet unique identifier', example: 'wallet_123456789' })
  id: string;

  @ApiProperty({ description: 'Seller unique identifier', example: 'seller_123' })
  sellerId: string;

  @ApiProperty({ type: WalletBalanceResponse })
  balances: WalletBalanceResponse;

  @ApiProperty({ description: 'Wallet currency', example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Amount available for settlement', example: 5000.00 })
  settlableAmount: number;

  @ApiPropertyOptional({ description: 'Last settlement date', example: '2024-01-31T15:30:00Z' })
  lastSettlementAt?: string;

  @ApiPropertyOptional({ description: 'Last settlement amount', example: 4500.00 })
  lastSettlementAmount?: number;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-02-01T10:15:00Z' })
  updatedAt: string;
}

export class WalletTransactionResponse {
  @ApiProperty({ description: 'Transaction unique identifier', example: 'txn_123456789' })
  id: string;

  @ApiProperty({ description: 'Wallet ID', example: 'wallet_123456789' })
  walletId: string;

  @ApiProperty({ description: 'Transaction ID', example: 'TXN_ABC123' })
  transactionId: string;

  @ApiProperty({ description: 'Transaction type', enum: ['CREDIT', 'DEBIT'], example: 'CREDIT' })
  type: string;

  @ApiProperty({ 
    description: 'Transaction category', 
    enum: ['SALE', 'REFUND', 'ADJUSTMENT', 'SETTLEMENT'],
    example: 'SALE'
  })
  category: string;

  @ApiProperty({ description: 'Transaction amount', example: 1000.00 })
  amount: number;

  @ApiProperty({ description: 'Signed amount (positive for credit, negative for debit)', example: 1000.00 })
  signedAmount: number;

  @ApiProperty({ description: 'Currency', example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Balance before transaction', example: 4000.00 })
  balanceBefore: number;

  @ApiProperty({ description: 'Balance after transaction', example: 5000.00 })
  balanceAfter: number;

  @ApiProperty({ description: 'Transaction description', example: 'Payment for order #12345' })
  description: string;

  @ApiPropertyOptional({ description: 'Reference type', example: 'ORDER' })
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID', example: 'order_12345' })
  referenceId?: string;

  @ApiProperty({ description: 'Processing timestamp', example: '2024-02-01T10:15:00Z' })
  processedAt: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-02-01T10:15:00Z' })
  createdAt: string;
}

// Calculation response schemas
export class SettlementCalculationResponse {
  @ApiProperty({ description: 'Seller ID', example: 'seller_123' })
  sellerId: string;

  @ApiProperty({ description: 'Calculation period start', example: '2024-01-01T00:00:00Z' })
  periodStart: string;

  @ApiProperty({ description: 'Calculation period end', example: '2024-01-31T23:59:59Z' })
  periodEnd: string;

  @ApiProperty({ description: 'Total gross amount', example: 10000.00 })
  grossAmount: number;

  @ApiProperty({ description: 'Total commission amount', example: 500.00 })
  commissionAmount: number;

  @ApiProperty({ description: 'Platform fee amount', example: 100.00 })
  platformFeeAmount: number;

  @ApiProperty({ description: 'Tax amount', example: 90.00 })
  taxAmount: number;

  @ApiProperty({ description: 'Net amount payable', example: 9310.00 })
  netAmount: number;

  @ApiProperty({ description: 'Currency', example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Number of orders', example: 25 })
  orderCount: number;

  @ApiProperty({ description: 'Number of transactions', example: 30 })
  transactionCount: number;

  @ApiProperty({ description: 'Calculation timestamp', example: '2024-02-01T10:00:00Z' })
  calculatedAt: string;
}

// Validation response schemas
export class ValidationResponse {
  @ApiProperty({ description: 'Is validation successful', example: true })
  isValid: boolean;

  @ApiProperty({ description: 'Validation errors', type: [String], example: [] })
  errors: string[];

  @ApiProperty({ description: 'Validation warnings', type: [String], example: ['Settlement amount is below minimum threshold'] })
  warnings: string[];
}

// Webhook response schemas
export class WebhookResponse {
  @ApiProperty({ 
    description: 'Webhook processing status', 
    enum: ['processed', 'ignored', 'settlement_not_found', 'error'],
    example: 'processed'
  })
  status: string;

  @ApiPropertyOptional({ description: 'Settlement ID', example: 'STL-2024-001' })
  settlementId?: string;

  @ApiPropertyOptional({ description: 'Payout status', example: 'completed' })
  payoutStatus?: string;

  @ApiPropertyOptional({ description: 'Error message', example: null })
  message?: string;

  @ApiProperty({ description: 'Processing timestamp', example: '2024-02-01T15:30:00Z' })
  processedAt: string;
}

// Error response schemas
export class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Invalid settlement data' })
  message: string;

  @ApiPropertyOptional({ description: 'Detailed error information', example: ['grossAmount must be a positive number'] })
  details?: string[];

  @ApiProperty({ description: 'Error timestamp', example: '2024-02-01T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/api/v1/settlements' })
  path: string;
}