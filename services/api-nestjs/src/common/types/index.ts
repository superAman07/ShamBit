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

export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  BUYER = 'BUYER',
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
}

export interface EventPayload {
  eventType: string;
  entityId: string;
  entityType: string;
  data: any;
  actorId: string;
  timestamp: Date;
}