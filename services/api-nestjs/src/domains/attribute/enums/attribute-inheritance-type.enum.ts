export enum AttributeInheritanceType {
  INHERITED = 'INHERITED',   // Inherited from parent category
  OVERRIDDEN = 'OVERRIDDEN', // Overridden in this category
  DIRECT = 'DIRECT',         // Directly assigned to this category
}

export const AttributeInheritanceTypeLabels: Record<AttributeInheritanceType, string> = {
  [AttributeInheritanceType.INHERITED]: 'Inherited',
  [AttributeInheritanceType.OVERRIDDEN]: 'Overridden',
  [AttributeInheritanceType.DIRECT]: 'Direct',
};

export const AttributeInheritanceTypeDescriptions: Record<AttributeInheritanceType, string> = {
  [AttributeInheritanceType.INHERITED]: 'Attribute inherited from parent category without modifications',
  [AttributeInheritanceType.OVERRIDDEN]: 'Attribute inherited from parent but with category-specific overrides',
  [AttributeInheritanceType.DIRECT]: 'Attribute directly assigned to this category',
};

export const AttributeInheritanceTypeIcons: Record<AttributeInheritanceType, string> = {
  [AttributeInheritanceType.INHERITED]: '⬇️',
  [AttributeInheritanceType.OVERRIDDEN]: '🔄',
  [AttributeInheritanceType.DIRECT]: '📌',
};

export const AttributeInheritanceTypeColors: Record<AttributeInheritanceType, string> = {
  [AttributeInheritanceType.INHERITED]: '#6B7280',  // Gray
  [AttributeInheritanceType.OVERRIDDEN]: '#F59E0B', // Yellow
  [AttributeInheritanceType.DIRECT]: '#10B981',     // Green
};

// Inheritance behavior helpers
export const isInherited = (type: AttributeInheritanceType): boolean => {
  return type === AttributeInheritanceType.INHERITED;
};

export const isOverridden = (type: AttributeInheritanceType): boolean => {
  return type === AttributeInheritanceType.OVERRIDDEN;
};

export const isDirect = (type: AttributeInheritanceType): boolean => {
  return type === AttributeInheritanceType.DIRECT;
};

export const canBeModified = (type: AttributeInheritanceType): boolean => {
  // Direct and overridden attributes can be modified
  return [AttributeInheritanceType.DIRECT, AttributeInheritanceType.OVERRIDDEN].includes(type);
};

export const requiresSourceCategory = (type: AttributeInheritanceType): boolean => {
  // Inherited and overridden attributes need a source category
  return [AttributeInheritanceType.INHERITED, AttributeInheritanceType.OVERRIDDEN].includes(type);
};