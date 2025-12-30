export class AttributeLocalization {
  id: string;
  attributeId: string;
  locale: string;
  
  // Localized Fields
  name: string;
  description?: string;
  helpText?: string;
  placeholder?: string;
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
  
  // Validation Methods
  static isValidLocale(locale: string): boolean {
    // Basic locale validation (language-country format)
    const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
    return localeRegex.test(locale);
  }
  
  // Utility Methods
  get languageCode(): string {
    return this.locale.split('-')[0];
  }
  
  get countryCode(): string | undefined {
    const parts = this.locale.split('-');
    return parts.length > 1 ? parts[1] : undefined;
  }
  
  get isComplete(): boolean {
    return !!(this.name && this.name.trim().length > 0);
  }
  
  // Comparison Methods
  equals(other: AttributeLocalization): boolean {
    return this.attributeId === other.attributeId && this.locale === other.locale;
  }
  
  // Serialization
  toJSON() {
    return {
      id: this.id,
      attributeId: this.attributeId,
      locale: this.locale,
      name: this.name,
      description: this.description,
      helpText: this.helpText,
      placeholder: this.placeholder,
      languageCode: this.languageCode,
      countryCode: this.countryCode,
      isComplete: this.isComplete,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}