export interface InventoryFilters {
  sellerId?: string;
  variantId?: string;
  warehouseId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface InventoryIncludeOptions {
  withVariant?: boolean;
  withWarehouse?: boolean;
}

export interface MovementFilters {
  referenceType?: string;
  referenceId?: string;
}
