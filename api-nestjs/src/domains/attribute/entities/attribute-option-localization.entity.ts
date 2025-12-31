export class AttributeOptionLocalization {
  id: string;
  optionId: string;
  locale: string;

  // Localized Fields
  label: string;
  description?: string;

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
    return !!(this.label && this.label.trim().length > 0);
  }

  // Comparison Methods
  equals(other: AttributeOptionLocalization): boolean {
    return this.optionId === other.optionId && this.locale === other.locale;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      optionId: this.optionId,
      locale: this.locale,
      label: this.label,
      description: this.description,
      languageCode: this.languageCode,
      countryCode: this.countryCode,
      isComplete: this.isComplete,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
