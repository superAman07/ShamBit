export class BulkInventoryAdjustmentDto {
  adjustments!: Array<{
    inventoryId: string;
    newQuantity: number;
    reason?: string;
    metadata?: Record<string, any>;
  }>;
  reason?: string;
}
