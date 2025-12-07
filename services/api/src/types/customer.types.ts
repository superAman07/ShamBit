import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type VerificationStatus = 'verified' | 'not_verified' | 'suspicious';

export type AccountStatus = 'active' | 'blocked';

// ============================================================================
// Customer Interfaces
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  verificationStatus: VerificationStatus;
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  lastLoginAt?: Date;
  lastOrderDate?: Date;
  createdAt: Date;
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
  createdAt: Date;
}

export interface CustomerNote {
  id: string;
  noteText: string;
  adminName: string;
  createdAt: Date;
}

export interface ActivityLogEntry {
  id: string;
  actionType: 'block' | 'unblock' | 'verification_change';
  reason?: string;
  oldValue?: string;
  newValue?: string;
  adminName: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface CustomerDetails extends Customer {
  addresses: Address[];
  recentOrders: OrderSummary[];
  notes: CustomerNote[];
  activityLog: ActivityLogEntry[];
}

// ============================================================================
// Filter and Pagination Interfaces
// ============================================================================

export interface CustomerFilters {
  search?: string;
  verificationStatus?: VerificationStatus;
  accountStatus?: AccountStatus;
}

export interface CustomerSorting {
  sortBy: 'name' | 'created_at' | 'last_login_at' | 'last_order_date';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

// ============================================================================
// Statistics Interface
// ============================================================================

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  blockedCustomers: number;
  newCustomersLast30Days: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface GetCustomersRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  verificationStatus?: VerificationStatus;
  accountStatus?: AccountStatus;
  sortBy?: 'name' | 'created_at' | 'last_login_at' | 'last_order_date';
  sortOrder?: 'asc' | 'desc';
}

export interface BlockCustomerRequest {
  reason: string;
}

export interface UnblockCustomerRequest {
  reason: string;
}

export interface UpdateVerificationStatusRequest {
  verificationStatus: VerificationStatus;
}

export interface AddCustomerNoteRequest {
  noteText: string;
}

export interface GetCustomerOrdersRequest {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface CustomerListResponse {
  success: boolean;
  data: Customer[];
  pagination: PaginationMeta;
  statistics: CustomerStatistics;
}

export interface CustomerDetailsResponse {
  success: boolean;
  data: CustomerDetails;
}

export interface BlockCustomerResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    isBlocked: boolean;
  };
}

export interface UnblockCustomerResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    isBlocked: boolean;
  };
}

export interface UpdateVerificationStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    verificationStatus: VerificationStatus;
  };
}

export interface AddCustomerNoteResponse {
  success: boolean;
  message: string;
  data: CustomerNote;
}

export interface CustomerOrdersResponse {
  success: boolean;
  data: OrderSummary[];
  pagination: PaginationMeta;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

// Verification status enum
export const verificationStatusSchema = z.enum(['verified', 'not_verified', 'suspicious']);

// Account status enum
export const accountStatusSchema = z.enum(['active', 'blocked']);

// Sort by enum - accepts both camelCase and snake_case
export const sortBySchema = z.enum(['name', 'created_at', 'createdAt', 'last_login_at', 'lastLoginAt', 'last_order_date', 'lastOrderDate'])
  .transform((val) => {
    // Convert camelCase to snake_case
    const mapping: Record<string, string> = {
      'createdAt': 'created_at',
      'lastLoginAt': 'last_login_at',
      'lastOrderDate': 'last_order_date',
    };
    return mapping[val] || val;
  });

// Sort order enum
export const sortOrderSchema = z.enum(['asc', 'desc']);

// Get customers query validation
export const getCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().min(1).max(100).optional(),
  verificationStatus: verificationStatusSchema.optional(),
  accountStatus: accountStatusSchema.optional(),
  sortBy: sortBySchema.optional().default('created_at'),
  sortOrder: sortOrderSchema.optional().default('desc'),
});

// Block customer request validation
export const blockCustomerSchema = z.object({
  reason: z.string().trim().min(1).max(500, 'Reason must not exceed 500 characters'),
});

// Unblock customer request validation
export const unblockCustomerSchema = z.object({
  reason: z.string().trim().min(1).max(500, 'Reason must not exceed 500 characters'),
});

// Update verification status request validation
export const updateVerificationStatusSchema = z.object({
  verificationStatus: verificationStatusSchema,
});

// Add customer note request validation
export const addCustomerNoteSchema = z.object({
  noteText: z.string().trim().min(1).max(1000, 'Note must not exceed 1000 characters'),
});

// Get customer orders query validation
export const getCustomerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Customer ID parameter validation
export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer ID format'),
});

// ============================================================================
// Type Exports from Zod Schemas
// ============================================================================

export type GetCustomersQuery = z.infer<typeof getCustomersQuerySchema>;
export type BlockCustomerBody = z.infer<typeof blockCustomerSchema>;
export type UnblockCustomerBody = z.infer<typeof unblockCustomerSchema>;
export type UpdateVerificationStatusBody = z.infer<typeof updateVerificationStatusSchema>;
export type AddCustomerNoteBody = z.infer<typeof addCustomerNoteSchema>;
export type GetCustomerOrdersQuery = z.infer<typeof getCustomerOrdersQuerySchema>;
export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
