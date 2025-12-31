export class InventoryMovementDto {
  quantity!: number;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}
