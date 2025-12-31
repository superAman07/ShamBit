import { Injectable } from '@nestjs/common';

@Injectable()
export class VariantAuditService {
  async logAction(
    subjectId: string,
    action: string,
    by: string,
    before: any,
    after: any,
    message?: string,
  ): Promise<void> {
    // Minimal stub for audit logging
    return;
  }
}
