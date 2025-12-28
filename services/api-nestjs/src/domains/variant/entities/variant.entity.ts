import { VariantStatus } from '../enums/variant-status.enum';
import { ProductVariantAttribute } from './variant-attribute.entity';

export interface VariantMetadata {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  barcode?: string;
  mpn?: string; // Manufacturer Part Number
  gtin?: string; // Global Trade Item Number
  customFields?: Record<string, any>;
  tags?: string[];
}

export class ProductVariant {
  id: string;
  productId: string;
  sku: string;
  status: VariantStatus;
  
  // Pricing
  priceOverride?: number;
  
  // Media
  images: string[];
  displayOrder: number;
  
  // Metadata
  metadata?: VariantMetadata;
  
  // Versioning
  version: number;
  
  // System Fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
  
  // Relations
  attributeValues?: ProductVariantAttribute[];
  
  constructor(data: Partial<ProductVariant>) {
    Object.assign(this, data);
  }
  
  // Domain Methods
  isActive(): boolean {
    return this.status === VariantStatus.ACTIVE && !this.deletedAt;
  }
  
  isDraft(): boolean {
    return this.status === VariantStatus.DRAFT;
  }
  
  canBeActivated(): boolean {
    return this.status === VariantStatus.DRAFT && !this.deletedAt;
  }
  
  canBeDisabled(): boolean {
    return this.status === VariantStatus.ACTIVE;
  }
  
  canBeDeleted(): boolean {
    return [VariantStatus.DRAFT, VariantStatus.DISABLED].includes(this.status);
  }
  
  activate(): void {
    if (!this.canBeActivated()) {
      throw new Error(`Cannot activate variant in ${this.status} status`);
    }
    this.status = VariantStatus.ACTIVE;
  }
  
  disable(): void {
    if (!this.canBeDisabled()) {
      throw new Error(`Cannot disable variant in ${this.status} status`);
    }
    this.status = VariantStatus.DISABLED;
  }
  
  archive(): void {
    this.status = VariantStatus.ARCHIVED;
  }
  
  softDelete(deletedBy: string): void {
    if (!this.canBeDeleted()) {
      throw new Error(`Cannot delete variant in ${this.status} status`);
    }
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.status = VariantStatus.ARCHIVED;
  }
  
  updateMetadata(metadata: Partial<VariantMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
  
  getAttributeValue(attributeId: string): string | undefined {
    return this.attributeValues?.find(av => av.attributeId === attributeId)?.value;
  }
  
  getAttributeValuesByType(attributeIds: string[]): Record<string, string> {
    const values: Record<string, string> = {};
    this.attributeValues?.forEach(av => {
      if (attributeIds.includes(av.attributeId)) {
        values[av.attributeId] = av.value;
      }
    });
    return values;
  }
  
  hasAttributeCombination(attributeValues: Record<string, string>): boolean {
    const currentValues = this.getAttributeValuesByType(Object.keys(attributeValues));
    return Object.entries(attributeValues).every(
      ([attributeId, value]) => currentValues[attributeId] === value
    );
  }
  
  generateDisplayName(attributeNames: Record<string, string>): string {
    if (!this.attributeValues?.length) {
      return this.sku;
    }
    
    const valueStrings = this.attributeValues
      .map(av => `${attributeNames[av.attributeId] || av.attributeId}: ${av.value}`)
      .join(', ');
    
    return valueStrings || this.sku;
  }
  
  incrementVersion(): void {
    this.version += 1;
  }
  
  hasPriceOverride(): boolean {
    return this.priceOverride !== null && this.priceOverride !== undefined;
  }
  
  getEffectivePrice(basePrice: number): number {
    return this.priceOverride ?? basePrice;
  }
  
  addImage(imageUrl: string, isPrimary = false): void {
    if (isPrimary) {
      // Remove primary flag from existing images
      this.images = this.images.map(img => img.replace('|primary', ''));
      this.images.unshift(`${imageUrl}|primary`);
    } else {
      this.images.push(imageUrl);
    }
  }
  
  removeImage(imageUrl: string): void {
    this.images = this.images.filter(img => !img.startsWith(imageUrl));
  }
  
  getPrimaryImage(): string | undefined {
    return this.images.find(img => img.includes('|primary'))?.split('|')[0];
  }
  
  getSecondaryImages(): string[] {
    return this.images
      .filter(img => !img.includes('|primary'))
      .map(img => img.split('|')[0]);
  }
}