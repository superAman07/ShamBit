export interface ProductVariantAttribute {
  attributeId: string;
  value: string;
  // Optional human-readable name of the attribute (not always present)
  attributeName?: string;
  // Optional display order for the attribute within the variant
  displayOrder?: number;
}

export class VariantAttribute implements ProductVariantAttribute {
  attributeId: string;
  value: string;
  attributeName?: string;
  displayOrder?: number;

  constructor(data: Partial<ProductVariantAttribute>) {
    this.attributeId = data.attributeId!;
    this.value = data.value!;
    this.attributeName = data.attributeName;
    this.displayOrder = data.displayOrder;
  }
}
