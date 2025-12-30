import { AttributeType, AttributeValidationRule } from '../enums/attribute-type.enum';

export interface AttributeValidationRules {
  [AttributeValidationRule.REQUIRED]?: boolean;
  [AttributeValidationRule.UNIQUE]?: boolean;
  [AttributeValidationRule.MIN_LENGTH]?: number;
  [AttributeValidationRule.MAX_LENGTH]?: number;
  [AttributeValidationRule.MIN_VALUE]?: number;
  [AttributeValidationRule.MAX_VALUE]?: number;
  [AttributeValidationRule.REGEX_PATTERN]?: string;
  [AttributeValidationRule.ALLOWED_VALUES]?: string[];
  [AttributeValidationRule.FILE_TYPES]?: string[];
  [AttributeValidationRule.MAX_FILE_SIZE]?: number;
}

export interface DimensionConfig {
  units: string[]; // ['cm', 'in', 'm']
  defaultUnit: string;
  precision: number;
}

export interface WeightConfig {
  units: string[]; // ['g', 'kg', 'lb', 'oz']
  defaultUnit: string;
  precision: number;
}

export interface CurrencyConfig {
  currencies: string[]; // ['USD', 'EUR', 'GBP']
  defaultCurrency: string;
  precision: number;
}

export class CategoryAttribute {
  id: string;
  categoryId: string;
  
  // Attribute definition
  name: string;
  slug: string;
  type: AttributeType;
  description?: string;
  
  // Validation rules
  isRequired: boolean;
  isInheritable: boolean;
  isOverridable: boolean;
  isVariant: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  
  // Type-specific configuration
  defaultValue?: string;
  allowedValues: string[];
  validationRules?: AttributeValidationRules;
  
  // Display properties
  displayOrder: number;
  displayName?: string;
  helpText?: string;
  placeholder?: string;
  
  // Inheritance tracking
  inheritedFrom?: string;
  overriddenAt?: string;
  
  // Audit fields
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<CategoryAttribute>) {
    Object.assign(this, data);
  }

  // Domain methods
  isInherited(): boolean {
    return !!this.inheritedFrom;
  }

  isOverridden(): boolean {
    return !!this.overriddenAt;
  }

  canBeInherited(): boolean {
    return this.isInheritable;
  }

  canBeOverridden(): boolean {
    return this.isOverridable;
  }

  isVariantAttribute(): boolean {
    return this.isVariant;
  }

  validateValue(value: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required validation
    if (this.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`${this.name} is required`);
      return { isValid: false, errors };
    }

    // Skip further validation if value is empty and not required
    if (!value && !this.isRequired) {
      return { isValid: true, errors: [] };
    }

    // Type-specific validation
    switch (this.type) {
      case AttributeType.TEXT:
        this.validateTextValue(value, errors);
        break;
      case AttributeType.NUMBER:
        this.validateNumberValue(value, errors);
        break;
      case AttributeType.BOOLEAN:
        this.validateBooleanValue(value, errors);
        break;
      case AttributeType.SELECT:
        this.validateSelectValue(value, errors);
        break;
      case AttributeType.MULTI_SELECT:
        this.validateMultiSelectValue(value, errors);
        break;
      case AttributeType.DATE:
        this.validateDateValue(value, errors);
        break;
      case AttributeType.URL:
        this.validateUrlValue(value, errors);
        break;
      case AttributeType.EMAIL:
        this.validateEmailValue(value, errors);
        break;
      case AttributeType.COLOR:
        this.validateColorValue(value, errors);
        break;
      case AttributeType.DIMENSION:
        this.validateDimensionValue(value, errors);
        break;
      case AttributeType.WEIGHT:
        this.validateWeightValue(value, errors);
        break;
      case AttributeType.CURRENCY:
        this.validateCurrencyValue(value, errors);
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateTextValue(value: any, errors: string[]): void {
    if (typeof value !== 'string') {
      errors.push(`${this.name} must be a string`);
      return;
    }

    const rules = this.validationRules;
    if (rules) {
      if (rules.MIN_LENGTH && value.length < rules.MIN_LENGTH) {
        errors.push(`${this.name} must be at least ${rules.MIN_LENGTH} characters`);
      }
      if (rules.MAX_LENGTH && value.length > rules.MAX_LENGTH) {
        errors.push(`${this.name} must not exceed ${rules.MAX_LENGTH} characters`);
      }
      if (rules.REGEX_PATTERN && !new RegExp(rules.REGEX_PATTERN).test(value)) {
        errors.push(`${this.name} format is invalid`);
      }
    }
  }

  private validateNumberValue(value: any, errors: string[]): void {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      errors.push(`${this.name} must be a valid number`);
      return;
    }

    const rules = this.validationRules;
    if (rules) {
      if (rules.MIN_VALUE !== undefined && numValue < rules.MIN_VALUE) {
        errors.push(`${this.name} must be at least ${rules.MIN_VALUE}`);
      }
      if (rules.MAX_VALUE !== undefined && numValue > rules.MAX_VALUE) {
        errors.push(`${this.name} must not exceed ${rules.MAX_VALUE}`);
      }
    }
  }

  private validateBooleanValue(value: any, errors: string[]): void {
    if (typeof value !== 'boolean') {
      errors.push(`${this.name} must be a boolean value`);
    }
  }

  private validateSelectValue(value: any, errors: string[]): void {
    if (!this.allowedValues.includes(value)) {
      errors.push(`${this.name} must be one of: ${this.allowedValues.join(', ')}`);
    }
  }

  private validateMultiSelectValue(value: any, errors: string[]): void {
    if (!Array.isArray(value)) {
      errors.push(`${this.name} must be an array`);
      return;
    }

    for (const item of value) {
      if (!this.allowedValues.includes(item)) {
        errors.push(`${this.name} contains invalid value: ${item}`);
      }
    }
  }

  private validateDateValue(value: any, errors: string[]): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(`${this.name} must be a valid date`);
    }
  }

  private validateUrlValue(value: any, errors: string[]): void {
    try {
      new URL(value);
    } catch {
      errors.push(`${this.name} must be a valid URL`);
    }
  }

  private validateEmailValue(value: any, errors: string[]): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push(`${this.name} must be a valid email address`);
    }
  }

  private validateColorValue(value: any, errors: string[]): void {
    // Support hex, rgb, rgba, hsl, hsla formats
    const colorRegex = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\))$/;
    if (!colorRegex.test(value)) {
      errors.push(`${this.name} must be a valid color format`);
    }
  }

  private validateDimensionValue(value: any, errors: string[]): void {
    // Expected format: { value: number, unit: string }
    if (!value || typeof value !== 'object' || !value.value || !value.unit) {
      errors.push(`${this.name} must have value and unit properties`);
      return;
    }

    if (isNaN(Number(value.value))) {
      errors.push(`${this.name} value must be a number`);
    }

    // Validate unit against allowed units (would be in validation rules)
    const rules = this.validationRules as any;
    if (rules?.allowedUnits && !rules.allowedUnits.includes(value.unit)) {
      errors.push(`${this.name} unit must be one of: ${rules.allowedUnits.join(', ')}`);
    }
  }

  private validateWeightValue(value: any, errors: string[]): void {
    // Similar to dimension validation
    this.validateDimensionValue(value, errors);
  }

  private validateCurrencyValue(value: any, errors: string[]): void {
    // Expected format: { amount: number, currency: string }
    if (!value || typeof value !== 'object' || !value.amount || !value.currency) {
      errors.push(`${this.name} must have amount and currency properties`);
      return;
    }

    if (isNaN(Number(value.amount))) {
      errors.push(`${this.name} amount must be a number`);
    }

    // Validate currency code
    const rules = this.validationRules as any;
    if (rules?.allowedCurrencies && !rules.allowedCurrencies.includes(value.currency)) {
      errors.push(`${this.name} currency must be one of: ${rules.allowedCurrencies.join(', ')}`);
    }
  }

  getTypeSpecificConfig(): any {
    switch (this.type) {
      case AttributeType.DIMENSION:
      case AttributeType.WEIGHT:
      case AttributeType.CURRENCY:
        return this.validationRules;
      default:
        return null;
    }
  }
}