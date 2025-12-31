import { AttributeDataType } from '../../attribute/enums/attribute-data-type.enum';
import { Attribute } from '../../attribute/entities/attribute.entity';
import { AttributeOption } from '../../attribute/entities/attribute-option.entity';

export class ProductAttributeValue {
  id: string;
  productId: string;
  attributeId: string;

  // Value Storage (polymorphic based on attribute data type)
  stringValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: Date;
  jsonValue?: any;
  optionId?: string;

  // Prisma compatibility - computed value for database storage
  get value(): any {
    return {
      stringValue: this.stringValue,
      numberValue: this.numberValue,
      booleanValue: this.booleanValue,
      dateValue: this.dateValue,
      jsonValue: this.jsonValue,
      optionId: this.optionId,
    };
  }

  // Localization
  locale: string;

  // Inheritance Tracking
  inheritedFrom?: string; // Category ID if inherited
  isOverridden: boolean;

  // System Fields
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  attribute?: Attribute;
  option?: AttributeOption;

  // Computed Properties
  get hasValue(): boolean {
    return (
      (this.stringValue !== null && this.stringValue !== undefined) ||
      (this.numberValue !== null && this.numberValue !== undefined) ||
      (this.booleanValue !== null && this.booleanValue !== undefined) ||
      (this.dateValue !== null && this.dateValue !== undefined) ||
      (this.jsonValue !== null && this.jsonValue !== undefined) ||
      (this.optionId !== null && this.optionId !== undefined)
    );
  }

  get isEmpty(): boolean {
    return !this.hasValue;
  }

  get isInherited(): boolean {
    return !!this.inheritedFrom && !this.isOverridden;
  }

  get isDirectlySet(): boolean {
    return !this.inheritedFrom;
  }

  // Value Access Methods
  getValue(): any {
    if (!this.attribute) {
      throw new Error('Attribute must be loaded to get typed value');
    }

    switch (this.attribute.dataType) {
      case AttributeDataType.STRING:
      case AttributeDataType.TEXT:
      case AttributeDataType.RICH_TEXT:
      case AttributeDataType.EMAIL:
      case AttributeDataType.URL:
      case AttributeDataType.PHONE:
        return this.stringValue;

      case AttributeDataType.NUMBER:
      case AttributeDataType.DECIMAL:
        return this.numberValue;

      case AttributeDataType.BOOLEAN:
        return this.booleanValue;

      case AttributeDataType.DATE:
      case AttributeDataType.DATETIME:
        return this.dateValue;

      case AttributeDataType.JSON:
        return this.jsonValue;

      case AttributeDataType.ENUM:
        return this.option ? this.option.value : this.optionId;

      case AttributeDataType.MULTI_ENUM:
        // For multi-enum, we store array of option IDs in jsonValue
        return this.jsonValue;

      case AttributeDataType.COLOR:
        return this.stringValue;

      case AttributeDataType.IMAGE:
      case AttributeDataType.FILE:
        return this.stringValue; // URL or file path

      default:
        return null;
    }
  }

  setValue(value: any, attribute: Attribute): void {
    this.attribute = attribute;

    // Clear all values first
    this.stringValue = undefined;
    this.numberValue = undefined;
    this.booleanValue = undefined;
    this.dateValue = undefined;
    this.jsonValue = undefined;
    this.optionId = undefined;

    if (value === null || value === undefined) {
      return;
    }

    switch (attribute.dataType) {
      case AttributeDataType.STRING:
      case AttributeDataType.TEXT:
      case AttributeDataType.RICH_TEXT:
      case AttributeDataType.EMAIL:
      case AttributeDataType.URL:
      case AttributeDataType.PHONE:
      case AttributeDataType.COLOR:
      case AttributeDataType.IMAGE:
      case AttributeDataType.FILE:
        this.stringValue = String(value);
        break;

      case AttributeDataType.NUMBER:
      case AttributeDataType.DECIMAL:
        this.numberValue = Number(value);
        break;

      case AttributeDataType.BOOLEAN:
        this.booleanValue = Boolean(value);
        break;

      case AttributeDataType.DATE:
      case AttributeDataType.DATETIME:
        this.dateValue = value instanceof Date ? value : new Date(value);
        break;

      case AttributeDataType.JSON:
        this.jsonValue = value;
        break;

      case AttributeDataType.ENUM:
        if (typeof value === 'string') {
          // Find option by value
          const option = attribute.options?.find((opt) => opt.value === value);
          this.optionId = option?.id || value;
        } else {
          this.optionId = value;
        }
        break;

      case AttributeDataType.MULTI_ENUM:
        if (Array.isArray(value)) {
          // Store array of option IDs or values
          this.jsonValue = value;
        } else {
          this.jsonValue = [value];
        }
        break;

      default:
        throw new Error(
          `Unsupported attribute data type: ${attribute.dataType}`,
        );
    }
  }

  // Display Methods
  getDisplayValue(locale: string = 'en'): string {
    if (!this.hasValue) {
      return '';
    }

    if (!this.attribute) {
      return String(this.getValue() || '');
    }

    switch (this.attribute.dataType) {
      case AttributeDataType.BOOLEAN:
        return this.booleanValue ? 'Yes' : 'No';

      case AttributeDataType.DATE:
        return this.dateValue ? this.dateValue.toLocaleDateString(locale) : '';

      case AttributeDataType.DATETIME:
        return this.dateValue ? this.dateValue.toLocaleString(locale) : '';

      case AttributeDataType.ENUM:
        return this.option
          ? this.option.getLocalizedLabel(locale)
          : String(this.optionId || '');

      case AttributeDataType.MULTI_ENUM:
        if (Array.isArray(this.jsonValue) && this.attribute.options) {
          return this.jsonValue
            .map((val) => {
              const option = this.attribute!.options!.find(
                (opt) => opt.value === val || opt.id === val,
              );
              return option ? option.getLocalizedLabel(locale) : String(val);
            })
            .join(', ');
        }
        return '';

      case AttributeDataType.NUMBER:
      case AttributeDataType.DECIMAL:
        if (this.numberValue !== null && this.numberValue !== undefined) {
          return this.numberValue.toLocaleString(locale);
        }
        return '';

      default:
        return String(this.getValue() || '');
    }
  }

  // Validation Methods
  validate(): { isValid: boolean; errors: string[] } {
    if (!this.attribute) {
      return {
        isValid: false,
        errors: ['Attribute must be loaded for validation'],
      };
    }

    return this.attribute.validateValue(this.getValue());
  }

  // Inheritance Methods
  markAsInherited(sourceCategoryId: string): void {
    this.inheritedFrom = sourceCategoryId;
    this.isOverridden = false;
  }

  markAsOverridden(): void {
    this.isOverridden = true;
  }

  clearInheritance(): void {
    this.inheritedFrom = undefined;
    this.isOverridden = false;
  }

  // Comparison Methods
  equals(other: ProductAttributeValue): boolean {
    return (
      this.productId === other.productId &&
      this.attributeId === other.attributeId &&
      this.locale === other.locale
    );
  }

  hasSameValue(other: ProductAttributeValue): boolean {
    if (!this.attribute || !other.attribute) {
      return false;
    }

    const thisValue = this.getValue();
    const otherValue = other.getValue();

    // Handle different data types
    switch (this.attribute.dataType) {
      case AttributeDataType.JSON:
      case AttributeDataType.MULTI_ENUM:
        return JSON.stringify(thisValue) === JSON.stringify(otherValue);

      case AttributeDataType.DATE:
      case AttributeDataType.DATETIME:
        if (thisValue instanceof Date && otherValue instanceof Date) {
          return thisValue.getTime() === otherValue.getTime();
        }
        return thisValue === otherValue;

      default:
        return thisValue === otherValue;
    }
  }

  // Utility Methods
  clone(): ProductAttributeValue {
    const cloned = new ProductAttributeValue();

    cloned.id = this.id;
    cloned.productId = this.productId;
    cloned.attributeId = this.attributeId;
    cloned.stringValue = this.stringValue;
    cloned.numberValue = this.numberValue;
    cloned.booleanValue = this.booleanValue;
    cloned.dateValue = this.dateValue;
    cloned.jsonValue = this.jsonValue
      ? JSON.parse(JSON.stringify(this.jsonValue))
      : undefined;
    cloned.optionId = this.optionId;
    cloned.locale = this.locale;
    cloned.inheritedFrom = this.inheritedFrom;
    cloned.isOverridden = this.isOverridden;
    cloned.createdAt = this.createdAt;
    cloned.updatedAt = this.updatedAt;
    cloned.attribute = this.attribute;
    cloned.option = this.option;

    return cloned;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      productId: this.productId,
      attributeId: this.attributeId,
      value: this.getValue(),
      displayValue: this.getDisplayValue(),
      locale: this.locale,
      inheritedFrom: this.inheritedFrom,
      isOverridden: this.isOverridden,
      hasValue: this.hasValue,
      isEmpty: this.isEmpty,
      isInherited: this.isInherited,
      isDirectlySet: this.isDirectlySet,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
