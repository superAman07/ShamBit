export enum BrandRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum BrandRequestType {
  NEW_BRAND = 'NEW_BRAND',
  BRAND_UPDATE = 'BRAND_UPDATE',
  BRAND_REACTIVATION = 'BRAND_REACTIVATION',
}

export const BrandRequestStatusLabels = {
  [BrandRequestStatus.PENDING]: 'Pending Review',
  [BrandRequestStatus.APPROVED]: 'Approved',
  [BrandRequestStatus.REJECTED]: 'Rejected',
  [BrandRequestStatus.CANCELLED]: 'Cancelled',
} as const;

export const BrandRequestTypeLabels = {
  [BrandRequestType.NEW_BRAND]: 'New Brand Request',
  [BrandRequestType.BRAND_UPDATE]: 'Brand Update Request',
  [BrandRequestType.BRAND_REACTIVATION]: 'Brand Reactivation Request',
} as const;