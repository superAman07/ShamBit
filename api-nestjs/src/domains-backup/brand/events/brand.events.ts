// Brand Domain Events - Following strict naming convention
export class BrandCreatedEvent {
  static readonly eventName = 'brand.created';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly scope: string,
    public readonly ownerId: string,
    public readonly createdBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandUpdatedEvent {
  static readonly eventName = 'brand.updated';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly changes: Record<string, { from: any; to: any }>,
    public readonly updatedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandApprovedEvent {
  static readonly eventName = 'brand.approved';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly approvedBy: string,
    public readonly ownerId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandRejectedEvent {
  static readonly eventName = 'brand.rejected';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly rejectedBy: string,
    public readonly ownerId: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandActivatedEvent {
  static readonly eventName = 'brand.activated';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly activatedBy: string,
    public readonly ownerId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandDeactivatedEvent {
  static readonly eventName = 'brand.deactivated';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly deactivatedBy: string,
    public readonly ownerId: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandSuspendedEvent {
  static readonly eventName = 'brand.suspended';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly suspendedBy: string,
    public readonly ownerId: string,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandDeletedEvent {
  static readonly eventName = 'brand.deleted';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly deletedBy: string,
    public readonly ownerId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandRequestedEvent {
  static readonly eventName = 'brand.requested';
  
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly brandName: string,
    public readonly type: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandAccessGrantedEvent {
  static readonly eventName = 'brand.access.granted';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly sellerId: string,
    public readonly permission: string,
    public readonly grantedBy: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandAccessRevokedEvent {
  static readonly eventName = 'brand.access.revoked';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly sellerId: string,
    public readonly revokedBy: string,
    public readonly reason?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// Legacy events for backward compatibility
export class BrandStatusChangedEvent {
  static readonly eventName = 'brand.status.changed';
  
  constructor(
    public readonly brandId: string,
    public readonly brandName: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly reason?: string,
    public readonly updatedBy?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandRequestCreatedEvent {
  static readonly eventName = 'brand.request.created';
  
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly brandName: string,
    public readonly type: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandRequestHandledEvent {
  static readonly eventName = 'brand.request.handled';
  
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly brandName: string,
    public readonly status: string,
    public readonly handledBy: string,
    public readonly brandId?: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class BrandRequestCancelledEvent {
  static readonly eventName = 'brand.request.cancelled';
  
  constructor(
    public readonly requestId: string,
    public readonly requesterId: string,
    public readonly brandName: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}