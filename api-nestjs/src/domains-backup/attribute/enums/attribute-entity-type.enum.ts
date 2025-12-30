export enum AttributeEntityType {
  PRODUCT = 'PRODUCT',     // Product-level attribute
  VARIANT = 'VARIANT',     // Variant-level attribute
  CATEGORY = 'CATEGORY',   // Category-level attribute (for metadata)
}

export const AttributeEntityTypeLabels: Record<AttributeEntityType, string> = {
  [AttributeEntityType.PRODUCT]: 'Product',
  [AttributeEntityType.VARIANT]: 'Variant',
  [AttributeEntityType.CATEGORY]: 'Category',
};

export const AttributeEntityTypeDescriptions: Record<AttributeEntityType, string> = {
  [AttributeEntityType.PRODUCT]: 'Attribute applies to the entire product',
  [AttributeEntityType.VARIANT]: 'Attribute applies to individual product variants',
  [AttributeEntityType.CATEGORY]: 'Attribute applies to category metadata',
};

export const AttributeEntityTypePluralLabels: Record<AttributeEntityType, string> = {
  [AttributeEntityType.PRODUCT]: 'Products',
  [AttributeEntityType.VARIANT]: 'Variants',
  [AttributeEntityType.CATEGORY]: 'Categories',
};

// Entity type behavior helpers
export const isProductLevel = (type: AttributeEntityType): boolean => {
  return type === AttributeEntityType.PRODUCT;
};

export const isVariantLevel = (type: AttributeEntityType): boolean => {
  return type === AttributeEntityType.VARIANT;
};

export const isCategoryLevel = (type: AttributeEntityType): boolean => {
  return type === AttributeEntityType.CATEGORY;
};

export const canDriveVariants = (type: AttributeEntityType): boolean => {
  // Only variant-level attributes can drive product variants
  return type === AttributeEntityType.VARIANT;
};

export const supportsInheritance = (type: AttributeEntityType): boolean => {
  // Product and variant attributes support category inheritance
  return [AttributeEntityType.PRODUCT, AttributeEntityType.VARIANT].includes(type);
};