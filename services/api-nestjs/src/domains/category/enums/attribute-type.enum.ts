export enum AttributeType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  DATE = 'DATE',
  URL = 'URL',
  EMAIL = 'EMAIL',
  JSON = 'JSON',
  FILE_URL = 'FILE_URL',
  COLOR = 'COLOR',
  DIMENSION = 'DIMENSION',
  WEIGHT = 'WEIGHT',
  CURRENCY = 'CURRENCY',
}

export enum AttributeValidationRule {
  REQUIRED = 'REQUIRED',
  UNIQUE = 'UNIQUE',
  MIN_LENGTH = 'MIN_LENGTH',
  MAX_LENGTH = 'MAX_LENGTH',
  MIN_VALUE = 'MIN_VALUE',
  MAX_VALUE = 'MAX_VALUE',
  REGEX_PATTERN = 'REGEX_PATTERN',
  ALLOWED_VALUES = 'ALLOWED_VALUES',
  FILE_TYPES = 'FILE_TYPES',
  MAX_FILE_SIZE = 'MAX_FILE_SIZE',
}

export const AttributeTypeLabels = {
  [AttributeType.TEXT]: 'Text',
  [AttributeType.NUMBER]: 'Number',
  [AttributeType.BOOLEAN]: 'Boolean',
  [AttributeType.SELECT]: 'Single Select',
  [AttributeType.MULTI_SELECT]: 'Multi Select',
  [AttributeType.DATE]: 'Date',
  [AttributeType.URL]: 'URL',
  [AttributeType.EMAIL]: 'Email',
  [AttributeType.JSON]: 'JSON Object',
  [AttributeType.FILE_URL]: 'File URL',
  [AttributeType.COLOR]: 'Color',
  [AttributeType.DIMENSION]: 'Dimension',
  [AttributeType.WEIGHT]: 'Weight',
  [AttributeType.CURRENCY]: 'Currency',
} as const;

export const AttributeTypeDescriptions = {
  [AttributeType.TEXT]: 'Free text input',
  [AttributeType.NUMBER]: 'Numeric value',
  [AttributeType.BOOLEAN]: 'True/false value',
  [AttributeType.SELECT]: 'Single selection from predefined options',
  [AttributeType.MULTI_SELECT]: 'Multiple selections from predefined options',
  [AttributeType.DATE]: 'Date value',
  [AttributeType.URL]: 'Valid URL',
  [AttributeType.EMAIL]: 'Valid email address',
  [AttributeType.JSON]: 'Structured JSON data',
  [AttributeType.FILE_URL]: 'File upload URL',
  [AttributeType.COLOR]: 'Color value (hex, rgb, etc.)',
  [AttributeType.DIMENSION]: 'Physical dimension with units',
  [AttributeType.WEIGHT]: 'Weight value with units',
  [AttributeType.CURRENCY]: 'Currency amount with code',
} as const;

// Attribute types that support multiple values
export const MULTI_VALUE_TYPES = [AttributeType.MULTI_SELECT];

// Attribute types that require validation rules
export const VALIDATION_REQUIRED_TYPES = [
  AttributeType.SELECT,
  AttributeType.MULTI_SELECT,
  AttributeType.DIMENSION,
  AttributeType.WEIGHT,
  AttributeType.CURRENCY,
];

// Attribute types that can be used for variants
export const VARIANT_CAPABLE_TYPES = [
  AttributeType.TEXT,
  AttributeType.SELECT,
  AttributeType.COLOR,
  AttributeType.DIMENSION,
];

// Attribute types that are filterable by default
export const DEFAULT_FILTERABLE_TYPES = [
  AttributeType.SELECT,
  AttributeType.MULTI_SELECT,
  AttributeType.BOOLEAN,
  AttributeType.NUMBER,
  AttributeType.COLOR,
];