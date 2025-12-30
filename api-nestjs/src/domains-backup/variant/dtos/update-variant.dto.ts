export class UpdateVariantDto {
  sku?: string;
  priceOverride?: number;
  attributeValues?: Record<string, string>;
}

export class VariantStatusUpdateDto {
  status!: any;
  reason?: string;
}
