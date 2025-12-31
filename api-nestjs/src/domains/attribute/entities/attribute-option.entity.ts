import { AttributeOptionLocalization } from './attribute-option-localization.entity';

export class AttributeOption {
  id: string;
  attributeId: string;

  // Option Details
  value: string; // Internal value (used in database/API)
  label: string; // Display label (shown to users)
  description?: string; // Optional description
  color?: string; // Color for color swatches (hex format)
  imageUrl?: string; // Image URL for visual options

  // Organization
  displayOrder: number;
  isDefault: boolean; // Whether this is the default selection

  // System Fields
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  localizations?: AttributeOptionLocalization[];

  // Computed Properties
  get hasColor(): boolean {
    return !!this.color && this.isValidHexColor(this.color);
  }

  get hasImage(): boolean {
    return !!this.imageUrl && this.isValidUrl(this.imageUrl);
  }

  get isVisual(): boolean {
    return this.hasColor || this.hasImage;
  }

  // Validation Methods
  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Localization Methods
  getLocalizedLabel(locale: string = 'en'): string {
    const localization = this.localizations?.find((l) => l.locale === locale);
    return localization?.label || this.label;
  }

  getLocalizedDescription(locale: string = 'en'): string | undefined {
    const localization = this.localizations?.find((l) => l.locale === locale);
    return localization?.description || this.description;
  }

  // Display Methods
  getDisplayValue(locale: string = 'en'): string {
    return this.getLocalizedLabel(locale);
  }

  getDisplayDescription(locale: string = 'en'): string | undefined {
    return this.getLocalizedDescription(locale);
  }

  // Comparison Methods
  equals(other: AttributeOption): boolean {
    return this.id === other.id || this.value === other.value;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      attributeId: this.attributeId,
      value: this.value,
      label: this.label,
      description: this.description,
      color: this.color,
      imageUrl: this.imageUrl,
      displayOrder: this.displayOrder,
      isDefault: this.isDefault,
      isActive: this.isActive,
      hasColor: this.hasColor,
      hasImage: this.hasImage,
      isVisual: this.isVisual,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
