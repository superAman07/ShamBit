// Common types used across domains
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: Date;
  deletedBy?: string;
}

export interface TenantAwareEntity extends BaseEntity {
  tenantId: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  SYSTEM = 'SYSTEM',
  PARTNER = 'PARTNER',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
}

export enum EntityStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tenantId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
  _meta?: {
    apiVersion?: string;
    deprecated?: boolean;
    tenantId?: string;
  };
}

export interface EventPayload {
  eventType: string;
  entityId: string;
  entityType: string;
  data: any;
  actorId: string;
  tenantId: string;
  timestamp: Date;
}

// Re-export types from other modules
export * from './tenant.types';
export * from './domain.types';
export * from './authorization.types';