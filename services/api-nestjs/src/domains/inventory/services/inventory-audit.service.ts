import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryAuditService {
  async logAction(subjectId: string, action: string, by: string, before: any, after: any, message?: string): Promise<void> {
    // Minimal audit stub - replace with real implementation
    return;
  }
}
