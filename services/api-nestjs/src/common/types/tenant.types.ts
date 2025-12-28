export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantType: TenantType;
  features: string[];
  limits: TenantLimits;
}

export enum TenantType {
  ENTERPRISE = 'ENTERPRISE',
  BUSINESS = 'BUSINESS',
  STARTER = 'STARTER',
  TRIAL = 'TRIAL',
}

export interface TenantLimits {
  maxUsers: number;
  maxProducts: number;
  maxOrders: number;
  maxStorage: number; // in MB
  apiRateLimit: number;
  features: string[];
}

export interface TenantAwareEntity {
  tenantId: string;
}

export interface TenantAwareQuery {
  tenantId: string;
  [key: string]: any;
}