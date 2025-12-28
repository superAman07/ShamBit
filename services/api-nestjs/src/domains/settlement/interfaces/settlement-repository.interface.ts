export interface SettlementFilters {
  sellerId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SettlementIncludeOptions {
  includeTransactions?: boolean;
  includeAccount?: boolean;
  includeJobs?: boolean;
}