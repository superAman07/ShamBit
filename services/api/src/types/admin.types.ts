import { AdminRole } from '@shambit/shared';

export interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateAdminRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role: AdminRole;
}
