import { BrandRequestStatus, BrandRequestType } from '../enums/request-status.enum';

export class BrandRequest {
  id: string;
  type: BrandRequestType;
  status: BrandRequestStatus;
  
  // Request data
  brandName: string;
  brandSlug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  categoryIds: string[];
  
  // Justification
  businessJustification: string;
  expectedUsage?: string;
  
  // Existing brand (for updates/reactivation)
  brandId?: string;
  
  // Requester
  requesterId: string;
  
  // Admin handling
  handledBy?: string;
  handledAt?: Date;
  adminNotes?: string;
  rejectionReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<BrandRequest>) {
    Object.assign(this, data);
  }

  // Domain methods
  isPending(): boolean {
    return this.status === BrandRequestStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === BrandRequestStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === BrandRequestStatus.REJECTED;
  }

  isCancelled(): boolean {
    return this.status === BrandRequestStatus.CANCELLED;
  }

  canBeHandled(): boolean {
    return this.isPending();
  }

  approve(handledBy: string, adminNotes?: string): void {
    if (!this.canBeHandled()) {
      throw new Error('Request cannot be approved in current status');
    }
    
    this.status = BrandRequestStatus.APPROVED;
    this.handledBy = handledBy;
    this.handledAt = new Date();
    this.adminNotes = adminNotes;
    this.rejectionReason = undefined;
  }

  reject(handledBy: string, rejectionReason: string, adminNotes?: string): void {
    if (!this.canBeHandled()) {
      throw new Error('Request cannot be rejected in current status');
    }
    
    this.status = BrandRequestStatus.REJECTED;
    this.handledBy = handledBy;
    this.handledAt = new Date();
    this.rejectionReason = rejectionReason;
    this.adminNotes = adminNotes;
  }

  cancel(): void {
    if (!this.canBeHandled()) {
      throw new Error('Request cannot be cancelled in current status');
    }
    
    this.status = BrandRequestStatus.CANCELLED;
  }

  isNewBrandRequest(): boolean {
    return this.type === BrandRequestType.NEW_BRAND;
  }

  isUpdateRequest(): boolean {
    return this.type === BrandRequestType.BRAND_UPDATE;
  }

  isReactivationRequest(): boolean {
    return this.type === BrandRequestType.BRAND_REACTIVATION;
  }
}