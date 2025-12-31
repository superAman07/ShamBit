export type VariantFilters = Record<string, any>;
export type PaginationOptions = { limit?: number; offset?: number };
export type VariantIncludeOptions = Record<string, boolean>;

export type BulkVariantOperation = {
  variantIds: string[];
  updates: any;
};
