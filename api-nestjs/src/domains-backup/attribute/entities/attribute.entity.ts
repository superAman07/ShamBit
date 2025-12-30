import { AttributeDataType } from '../enums/attribute-data-type.enum';
import { AttributeStatus } from '../enums/attribute-status.enum';
import { AttributeVisibility } from '../enums/attribute-visibility.enum';
import { AttributeOption } from './attribute-option.entity';
import { AttributeLocalization } from './attribute-localization.entity';

export interface AttributeValidationRule {
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Number validation
  min?: number;
  max?: number;
  step?: number;
  
  // Date validation
  minDate?: string;
  maxDate?: string;
  
  // File validation
  maxFileSize?: number;
  allowedFileTypes?: string[];
  
  // Custom validation
  customRules?: {
    rule: string;
    message: string;
    params?: Record<string, any>;
  }[];
}

export interface AttributeMetadata {
  // Display configuration
  inputType?: string;           // HTML input type override
  placeholder?: string;         // Input placeholder
  helpText?: string;           // Help text for users
  
  // UI configuration
  showInGrid?: boolean;        // Show in product grid
  showInDetails?: boolean;     // Show in product details
  showInFilters?: boolean;     // Show in search filters
  showInComparison?: boolean;  // Show in product comparison
  
  // Formatting
  prefix?: string;             // Value prefix (e.g., "$", "kg")
  suffix?: string;             // Value suffix (e.g., "cm", "%")
  decimalPlaces?: number;      // Number of decimal places
  
  // Grouping
  groupName?: string;          // Logical group name
  groupOrder?: number;         // Order within group
  
  // Advanced
  dependsOn?: string[];        // Dependent attribute IDs
  conditionalRules?: {
    condition: string;
    action: 'show' | 'hide' | 'require';
    value?: any;
  }[];
}

export class Attribute {
  id: string;
  
  // Basic Information
  name: string;
  slug: string;
  description?: string;
  
  // Data Type & Validation
  dataType: AttributeDataType;
  validation?: AttributeValidationRule;
  
  // Behavior Flags
  isRequired: boolean;
  isVariant: boolean;      // Drives product variants
  isFilterable: boolean;   // Can be used in search filters
  isSearchable: boolean;   // Indexed for full-text search
  isComparable: boolean;   // Can be used in product comparison
  
  // Display & Organization
  displayOrder: number;
  groupName?: string;
  helpText?: string;
  placeholder?: string;
  
  // Visibility & Access
  visibility: AttributeVisibility;
  adminOnly: boolean;      // Only admins can set values
  
  // Localization Support
  isLocalizable: boolean;  // Supports multiple languages
  
  // System Fields
  status: AttributeStatus;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relationships
  options?: AttributeOption[];
  localizations?: AttributeLocalization[];
  
  // Computed Properties
  get isActive(): boolean {
    return this.status === AttributeStatus.ACTIVE;
  }
  
  get isUsable(): boolean {
    return [AttributeStatus.ACTIVE, AttributeStatus.DEPRECATED].includes(this.status);
  }
  
  get requiresOptions(): boolean {
    return [AttributeDataType.ENUM, AttributeDataType.MULTI_ENUM].includes(this.dataType);
  }
  
  get isNumeric(): boolean {
    return [AttributeDataType.NUMBER, AttributeDataType.DECIMAL].includes(this.dataType);
  }
  
  get isText(): boolean {
    return [
      AttributeDataType.STRING,
      AttributeDataType.TEXT,
      AttributeDataType.RICH_TEXT,
      AttributeDataType.EMAIL,
      AttributeDataType.URL,
      AttributeDataType.PHONE,
    ].includes(this.dataType);
  }
  
  get isSelection(): boolean {
    return [AttributeDataType.ENUM, AttributeDataType.MULTI_ENUM].includes(this.dataType);
  }
  
  get isDate(): boolean {
    return [AttributeDataType.DATE, AttributeDataType.DATETIME].includes(this.dataType);
  }
  
  get isFile(): boolean {
    return [AttributeDataType.IMAGE, AttributeDataType.FILE].includes(this.dataType);
  }
  
  // Validation Methods
  validateValue(value: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.isRequired && (value === null || value === undefined || value === '')) {
      errors.push('This field is required');
      return { isValid: false, errors };
    }
    
    if (value === null || value === undefined || value === '') {
      return { isValid: true, errors: [] };
    }
    
    // Type-specific validation
    switch (this.dataType) {
      case AttributeDataType.STRING:
      case AttributeDataType.TEXT:
      case AttributeDataType.RICH_TEXT:
        this.validateStringValue(value, errors);
        break;
      case AttributeDataType.NUMBER:
      case AttributeDataType.DECIMAL:
        this.validateNumericValue(value, errors);
        break;
      case AttributeDataType.EMAIL:
        this.validateEmailValue(value, errors);
        break;
      case AttributeDataType.URL:
        this.validateUrlValue(value, errors);
        break;
      case AttributeDataType.DATE:
      case AttributeDataType.DATETIME:
        this.validateDateValue(value, errors);
        break;
      case AttributeDataType.BOOLEAN:
        this.validateBooleanValue(value, errors);
        break;
      case AttributeDataType.ENUM:
        this.validateEnumValue(value, errors);
        break;
      case AttributeDataType.MULTI_ENUM:
        this.validateMultiEnumValue(value, errors);
        break;
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  private validateStringValue(value: any, errors: string[]): void {
    if (typeof value !== 'string') {
      errors.push('Value must be a string');
      return;
    }
    
    if (this.validation?.minLength && value.length < this.validation.minLength) {
      errors.push(`Minimum length is ${this.validation.minLength} characters`);
    }
    
    if (this.validation?.maxLength && value.length > this.validation.maxLength) {
      errors.push(`Maximum length is ${this.validation.maxLength} characters`);
    }
    
    if (this.validation?.pattern) {
      const regex = new RegExp(this.validation.pattern);
      if (!regex.test(value)) {
        errors.push('Value does not match the required pattern');
      }
    }
  }
  
  private validateNumericValue(value: any, errors: string[]): void {
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
      errors.push('Value must be a valid number');
      return;
    }
    
    if (this.validation?.min !== undefined && numValue < this.validation.min) {
      errors.push(`Minimum value is ${this.validation.min}`);
    }
    
    if (this.validation?.max !== undefined && numValue > this.validation.max) {
      errors.push(`Maximum value is ${this.validation.max}`);
    }
    
    if (this.validation?.step && numValue % this.validation.step !== 0) {
      errors.push(`Value must be a multiple of ${this.validation.step}`);
    }
  }
  
  private validateEmailValue(value: any, errors: string[]): void {
    if (typeof value !== 'string') {
      errors.push('Email must be a string');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push('Invalid email format');
    }
  }
  
  private validateUrlValue(value: any, errors: string[]): void {
    if (typeof value !== 'string') {
      errors.push('URL must be a string');
      return;
    }
    
    try {
      new URL(value);
    } catch {
      errors.push('Invalid URL format');
    }
  }
  
  private validateDateValue(value: any, errors: string[]): void {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
      return;
    }
    
    if (this.validation?.minDate) {
      const minDate = new Date(this.validation.minDate);
      if (date < minDate) {
        errors.push(`Date must be after ${minDate.toISOString().split('T')[0]}`);
      }
    }
    
    if (this.validation?.maxDate) {
      const maxDate = new Date(this.validation.maxDate);
      if (date > maxDate) {
        errors.push(`Date must be before ${maxDate.toISOString().split('T')[0]}`);
      }
    }
  }
  
  private validateBooleanValue(value: any, errors: string[]): void {
    if (typeof value !== 'boolean') {
      errors.push('Value must be true or false');
    }
  }
  
  private validateEnumValue(value: any, errors: string[]): void {
    if (!this.options || this.options.length === 0) {
      errors.push('No options available for this attribute');
      return;
    }
    
    const validValues = this.options.filter(opt => opt.isActive).map(opt => opt.value);
    if (!validValues.includes(value)) {
      errors.push('Invalid option selected');
    }
  }
  
  private validateMultiEnumValue(value: any, errors: string[]): void {
    if (!Array.isArray(value)) {
      errors.push('Value must be an array');
      return;
    }
    
    if (!this.options || this.options.length === 0) {
      errors.push('No options available for this attribute');
      return;
    }
    
    const validValues = this.options.filter(opt => opt.isActive).map(opt => opt.value);
    const invalidValues = value.filter(v => !validValues.includes(v));
    
    if (invalidValues.length > 0) {
      errors.push(`Invalid options: ${invalidValues.join(', ')}`);
    }
  }
  
  // Localization Methods
  getLocalizedName(locale: string = 'en'): string {
    const localization = this.localizations?.find(l => l.locale === locale);
    return localization?.name || this.name;
  }
  
  getLocalizedDescription(locale: string = 'en'): string | undefined {
    const localization = this.localizations?.find(l => l.locale === locale);
    return localization?.description || this.description;
  }
  
  getLocalizedHelpText(locale: string = 'en'): string | undefined {
    const localization = this.localizations?.find(l => l.locale === locale);
    return localization?.helpText || this.helpText;
  }
  
  getLocalizedPlaceholder(locale: string = 'en'): string | undefined {
    const localization = this.localizations?.find(l => l.locale === locale);
    return localization?.placeholder || this.placeholder;
  }
}