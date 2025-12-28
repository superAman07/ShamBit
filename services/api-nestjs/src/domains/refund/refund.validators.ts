export class RefundValidators {
  static validateRefundCreation(createRefundDto: any, order: any, existingRefunds: any[]): void {
    // Check if order can be refunded
    if (!order.canBeRefunded) {
      throw new Error('Order cannot be refunded in current status');
    }

    // Check refund amount
    if (createRefundDto.amount <= 0) {
      throw new Error('Refund amount must be greater than zero');
    }

    // Check if refund amount exceeds order total
    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    if (totalRefunded + createRefundDto.amount > order.totalAmount) {
      throw new Error('Refund amount exceeds remaining refundable amount');
    }

    // Validate refund items if provided
    if (createRefundDto.items && createRefundDto.items.length > 0) {
      this.validateRefundItems(createRefundDto.items, order.items);
    }
  }

  static validateRefundItems(refundItems: any[], orderItems: any[]): void {
    for (const refundItem of refundItems) {
      const orderItem = orderItems.find(item => item.id === refundItem.orderItemId);
      
      if (!orderItem) {
        throw new Error(`Order item ${refundItem.orderItemId} not found`);
      }

      if (refundItem.quantity > orderItem.quantity) {
        throw new Error(`Refund quantity cannot exceed order quantity for item ${refundItem.orderItemId}`);
      }

      if (refundItem.amount > orderItem.totalPrice) {
        throw new Error(`Refund amount cannot exceed item total for item ${refundItem.orderItemId}`);
      }
    }
  }

  static validateRefundAmount(amount: number, maxAmount: number): void {
    if (amount <= 0) {
      throw new Error('Refund amount must be greater than zero');
    }

    if (amount > maxAmount) {
      throw new Error(`Refund amount cannot exceed ${maxAmount}`);
    }
  }

  static validateRefundReason(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Refund reason is required');
    }

    if (reason.length > 500) {
      throw new Error('Refund reason cannot exceed 500 characters');
    }
  }

  static validateBusinessRules(createRefundDto: any, order: any, refundPolicy: any): void {
    // Validate refund timing
    if (refundPolicy?.refundWindow) {
      const orderDate = new Date(order.createdAt);
      const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOrder > refundPolicy.refundWindow) {
        throw new Error(`Refund window of ${refundPolicy.refundWindow} days has expired`);
      }
    }

    // Validate minimum refund amount
    if (refundPolicy?.minimumRefundAmount && createRefundDto.amount < refundPolicy.minimumRefundAmount) {
      throw new Error(`Refund amount must be at least ${refundPolicy.minimumRefundAmount}`);
    }

    // Validate maximum refund amount
    if (refundPolicy?.maximumRefundAmount && createRefundDto.amount > refundPolicy.maximumRefundAmount) {
      throw new Error(`Refund amount cannot exceed ${refundPolicy.maximumRefundAmount}`);
    }

    // Validate refund type restrictions
    if (refundPolicy?.allowedRefundTypes && !refundPolicy.allowedRefundTypes.includes(createRefundDto.refundType)) {
      throw new Error(`Refund type ${createRefundDto.refundType} is not allowed`);
    }

    // Validate reason code restrictions
    if (refundPolicy?.allowedReasonCodes && createRefundDto.reasonCode && !refundPolicy.allowedReasonCodes.includes(createRefundDto.reasonCode)) {
      throw new Error(`Reason code ${createRefundDto.reasonCode} is not allowed`);
    }

    // Validate order status for refunds
    const allowedOrderStatuses = refundPolicy?.allowedOrderStatuses || ['DELIVERED', 'COMPLETED'];
    if (!allowedOrderStatuses.includes(order.status)) {
      throw new Error(`Cannot create refund for order in ${order.status} status`);
    }
  }

  static validateRefundPermissions(refund: any, userId: string, userRole: string, action: string): void {
    // Customer can only view their own refunds
    if (userRole === 'CUSTOMER' && refund.createdBy !== userId) {
      throw new Error('Access denied to this refund');
    }

    // Merchant can only view refunds for their orders
    if (userRole === 'MERCHANT' && refund.order?.sellerId !== userId) {
      throw new Error('Access denied to this refund');
    }

    // Additional action-specific validations
    if (action === 'APPROVE' || action === 'REJECT') {
      if (userRole !== 'ADMIN' && userRole !== 'MERCHANT') {
        throw new Error('Insufficient permissions to approve/reject refunds');
      }
    }

    if (action === 'PROCESS') {
      if (userRole !== 'ADMIN' && userRole !== 'SYSTEM') {
        throw new Error('Insufficient permissions to process refunds');
      }
    }
  }
}