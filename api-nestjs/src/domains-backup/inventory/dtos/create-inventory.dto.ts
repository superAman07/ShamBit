export class CreateInventoryDto {
  variantId!: string;
  sellerId!: string;
  warehouseId?: string;
  lowStockThreshold?: number;
  allowBackorders?: boolean;
}
