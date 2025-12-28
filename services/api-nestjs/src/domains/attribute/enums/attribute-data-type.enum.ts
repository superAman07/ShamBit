export enum AttributeDataType {
  // Text Types
  STRING = 'STRING',           // Single line text
  TEXT = 'TEXT',               // Multi-line text
  RICH_TEXT = 'RICH_TEXT',     // Rich text with formatting
  EMAIL = 'EMAIL',             // Email validation
  URL = 'URL',                 // URL validation
  PHONE = 'PHONE',             // Phone number validation
  
  // Numeric Types
  NUMBER = 'NUMBER',           // Integer numbers
  DECIMAL = 'DECIMAL',         // Decimal numbers
  
  // Boolean Type
  BOOLEAN = 'BOOLEAN',         // True/false checkbox
  
  // Date Types
  DATE = 'DATE',               // Date only
  DATETIME = 'DATETIME',       // Date and time
  
  // Selection Types
  ENUM = 'ENUM',               // Single select dropdown
  MULTI_ENUM = 'MULTI_ENUM',   // Multi-select dropdown
  
  // Visual Types
  COLOR = 'COLOR',             // Color picker
  IMAGE = 'IMAGE',             // Image upload
  FILE = 'FILE',               // File upload
  
  // Complex Types
  JSON = 'JSON',               // Structured JSON data
}

export const AttributeDataTypeLabels: Record<AttributeDataType, string> = {
  [AttributeDataType.STRING]: 'Text',
  [AttributeDataType.TEXT]: 'Long Text',
  [AttributeDataType.RICH_TEXT]: 'Rich Text',
  [AttributeDataType.EMAIL]: 'Email',
  [AttributeDataType.URL]: 'URL',
  [AttributeDataType.PHONE]: 'Phone Number',
  [AttributeDataType.NUMBER]: 'Number',
  [AttributeDataType.DECIMAL]: 'Decimal',
  [AttributeDataType.BOOLEAN]: 'Yes/No',
  [AttributeDataType.DATE]: 'Date',
  [AttributeDataType.DATETIME]: 'Date & Time',
  [AttributeDataType.ENUM]: 'Dropdown',
  [AttributeDataType.MULTI_ENUM]: 'Multi-Select',
  [AttributeDataType.COLOR]: 'Color',
  [AttributeDataType.IMAGE]: 'Image',
  [AttributeDataType.FILE]: 'File',
  [AttributeDataType.JSON]: 'Structured Data',
};

export const AttributeDataTypeDescriptions: Record<AttributeDataType, string> = {
  [AttributeDataType.STRING]: 'Single line text input (e.g., product name, SKU)',
  [AttributeDataType.TEXT]: 'Multi-line text input (e.g., description, notes)',
  [AttributeDataType.RICH_TEXT]: 'Rich text editor with formatting options',
  [AttributeDataType.EMAIL]: 'Email address with validation',
  [AttributeDataType.URL]: 'Web URL with validation',
  [AttributeDataType.PHONE]: 'Phone number with validation',
  [AttributeDataType.NUMBER]: 'Whole numbers (e.g., quantity, count)',
  [AttributeDataType.DECIMAL]: 'Decimal numbers (e.g., weight, price)',
  [AttributeDataType.BOOLEAN]: 'True/false checkbox (e.g., featured, available)',
  [AttributeDataType.DATE]: 'Date picker (e.g., release date)',
  [AttributeDataType.DATETIME]: 'Date and time picker (e.g., event time)',
  [AttributeDataType.ENUM]: 'Single selection from predefined options',
  [AttributeDataType.MULTI_ENUM]: 'Multiple selections from predefined options',
  [AttributeDataType.COLOR]: 'Color picker for color values',
  [AttributeDataType.IMAGE]: 'Image upload for visual attributes',
  [AttributeDataType.FILE]: 'File upload for documents/attachments',
  [AttributeDataType.JSON]: 'Complex structured data in JSON format',
};

// Validation helpers
export const isNumericType = (type: AttributeDataType): boolean => {
  return [AttributeDataType.NUMBER, AttributeDataType.DECIMAL].includes(type);
};

export const isTextType = (type: AttributeDataType): boolean => {
  return [
    AttributeDataType.STRING,
    AttributeDataType.TEXT,
    AttributeDataType.RICH_TEXT,
    AttributeDataType.EMAIL,
    AttributeDataType.URL,
    AttributeDataType.PHONE,
  ].includes(type);
};

export const isSelectionType = (type: AttributeDataType): boolean => {
  return [AttributeDataType.ENUM, AttributeDataType.MULTI_ENUM].includes(type);
};

export const isDateType = (type: AttributeDataType): boolean => {
  return [AttributeDataType.DATE, AttributeDataType.DATETIME].includes(type);
};

export const isFileType = (type: AttributeDataType): boolean => {
  return [AttributeDataType.IMAGE, AttributeDataType.FILE].includes(type);
};

export const requiresOptions = (type: AttributeDataType): boolean => {
  return isSelectionType(type);
};

export const supportsValidation = (type: AttributeDataType): boolean => {
  // All types support some form of validation
  return true;
};

export const supportsLocalization = (type: AttributeDataType): boolean => {
  // Text-based types support localization
  return isTextType(type) || isSelectionType(type);
};