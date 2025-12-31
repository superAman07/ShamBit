export interface AttributeOption {
  attributeId: string;
  values: string[];
}

export interface GenerateOptions {
  maxCombinations?: number;
}

export class GenerateVariantsDto {
  productId!: string;
  attributeOptions!: AttributeOption[];
  options?: GenerateOptions;
}
