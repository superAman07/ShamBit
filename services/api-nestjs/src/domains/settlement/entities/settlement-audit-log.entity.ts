export interface SettlementAuditLog {
  id: string;
  settlementId?: string | null;
  action: string;
  userId: string;
  performedBy?: string; // Keep for backward compatibility
  oldValues?: any;
  newValues?: any;
  previousState?: any; // Keep for backward compatibility
  newState?: any; // Keep for backward compatibility
  reason?: string;
  metadata?: any;
  user?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}