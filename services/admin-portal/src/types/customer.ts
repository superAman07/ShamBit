export type VerificationStatus = 'verified' | 'not_verified' | 'suspicious';

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  verificationStatus: VerificationStatus;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  lastLoginAt?: string;
  lastOrderDate?: string;
  createdAt: string;
}

export interface CustomerFilters {
  search?: string;
  verificationStatus?: VerificationStatus;
  accountStatus?: 'active' | 'blocked';
}

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  blockedCustomers: number;
  newCustomersLast30Days: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statistics: CustomerStatistics;
}

export interface Address {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  noteText: string;
  adminName: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  actionType: 'block' | 'unblock' | 'verification_change';
  reason?: string;
  oldValue?: string;
  newValue?: string;
  adminName: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CustomerDetails extends Customer {
  addresses: Address[];
  recentOrders: OrderSummary[];
  notes: CustomerNote[];
  activityLog: ActivityLogEntry[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface CustomerOrdersResponse {
  orders: OrderSummary[];
  pagination: PaginationMeta;
}
