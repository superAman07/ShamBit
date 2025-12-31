export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PolicyCondition[];
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  tenantId: string;
}

export interface PolicyCondition {
  attribute: string;
  operator: PolicyOperator;
  value: any;
}

export enum PolicyOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export interface AuthorizationContext {
  user: {
    id: string;
    roles: string[];
    attributes: Record<string, any>;
  };
  tenant: {
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
  resource: {
    type: string;
    id?: string;
    attributes: Record<string, any>;
  };
  environment: {
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
}
