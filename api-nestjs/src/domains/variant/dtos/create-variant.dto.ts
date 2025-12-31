export class CreateVariantDto {
  productId!: string;
  attributeValues!: Record<string, string>;
  sku?: string;
  priceOverride?: number;
}
