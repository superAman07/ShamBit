import { OrderStatus } from '../enums/order-status.enum';

export interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  sellerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface OrderIncludeOptions {
  items?: boolean;
  payments?: boolean;
  refunds?: boolean;
  shipments?: boolean;
  customer?: boolean;
  addresses?: boolean;
}