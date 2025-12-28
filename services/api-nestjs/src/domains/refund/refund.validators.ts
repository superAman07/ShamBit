import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { 
  RefundStatus, 
  RefundType, 
  RefundReason,
  RefundCategory,
  RefundErrorCode,
  canTransitionRefundStatus,
  getRefundErrorMessage,
  shouldRequireApproval,
  calculateRefundFees
} from './enums/refund-status.enum';
import { Refund } from './entities/refund.entity';
import { CreateRefundDto, CreateRefundItemDto } from './dtos/create-refund.dto';
import { ApproveRefundDto, RejectRefundDto } from './dtos/update-refund.dto';

export class RefundValidators {
  
  // ============================================================================
  // REFUND CREATION VALIDATION
  // ============================================================================
  
  static validateRefundCreation(
    createRefundDto: CreateRefundDto,
    order: any,
    existingRefunds: Refund[] = []
  ): void {
    // Validate order status
    this.validateOrderEligibility(order);
    
    // Validate refund type and data consistency
    this.validateRefundTypeConsistency(createRefundDto);
    
    // Validate no duplicate active refunds
    this.validateNoDuplicateRefunds(order.id, existingRefunds);
    
    // Validate refund amount limits
    this.validateRefundAmountLimits(createRefundDto, order, existingRefunds);
    
    // Validate items if item-level refund
    if (createRefundDto.refundType === RefundType.ITEM_LEVEL) {
      this.validateRefundItems(createRefundDto.items || [], order);
    }
    
    // Validate refund window
    this.validateRefundWindow(order);
  }
  
  static validateOrderEligibility(order: any): void {
    if (!order) {
      throw new BadRequestException(getRefundErrorMessage(RefundErrorCode.INVALID_ORDER_STATUS));
    }
    
    // Check order status - only certain statuses allow refunds
    const refundableStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (!refundableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order status '${order.status}' does not allow refunds. Allowed statuses: ${refundableStatuses.join(', ')}`
      );
    }
    
    // Check if order has successful payment
    if (!order.payments || !order.payments.some((p: any) => p.status === 'COMPLETED')) {
      throw new BadRequestException(getRefundErrorMessage(RefundErrorCode.PAYMENT_NOT_CAPTURED));
    }
  }
  
  static validateRefundTypeConsistency(createRefundDto: CreateRefundDto): void {
    const { refundType, requestedAmount, items } = createRefundDto;
    
    switch (refundType) {
      case RefundType.FULL:
        if (requestedAmount) {
          throw new BadRequestException('Full refunds cannot specify a custom amount');
        }
        if (items && items.length > 0) {
          throw new BadRequestException('Full refunds cannot specify individual items');
        }
        break;
        
      case RefundType.PARTIAL:
        if (!requestedAmount || requestedAmount <= 0) {
          throw new BadRequestException('Partial refunds must specify a valid amount');
        }
        if (items && items.length > 0) {
          throw new BadRequestException('Partial refunds cannot specify individual items');
        }
        break;
        
      case RefundType.ITEM_LEVEL:
        if (requestedAmount) {
          throw new BadRequestException('Item-level refunds cannot specify a custom amount');
        }
        if (!items || items.length === 0) {
          throw new BadRequestException('Item-level refunds must specify at least one item');
        }
        break;
        
      default:
        throw new BadRequestException(`Invalid refund type: ${refundType}`);
    }
  }
  
  static validateNoDuplicateRefunds(orderId: string, existingRefunds: Refund[]): void {
    const activeRefunds = existingRefunds.filter(r => r.isActive());
    
    if (activeRefunds.length > 0) {
      throw new ConflictException(
        `Order ${orderId} already has an active refund (${activeRefunds[0].refundNumber})`
      );
    }
  }
  
  static validateRefundAmountLimits(
    createRefundDto: CreateRefundDto,
    order: any,
    existingRefunds: Refund[]
  ): void {
    const totalOrderAmount = order.totalAmount;
    const totalRefundedAmount = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || 0), 0);
    
    const availableRefundAmount = totalOrderAmount - totalRefundedAmount;
    
    if (availableRefundAmount <= 0) {
      throw new BadRequestException(getRefundErrorMessage(RefundErrorCode.ALREADY_REFUNDED));
    }
    
    let requestedRefundAmount = 0;
    
    switch (createRefundDto.refundType) {
      case RefundType.FULL:
        requestedRefundAmount = availableRefundAmount;
        break;
        
      case RefundType.PARTIAL:
        requestedRefundAmount = createRefundDto.requestedAmount!;
        if (requestedRefundAmount > availableRefundAmount) {
          throw new BadRequestException(
            getRefundErrorMessage(RefundErrorCode.PARTIAL_REFUND_EXCEEDS_PAYMENT)
          );
        }
        break;
        
      case RefundType.ITEM_LEVEL:
        requestedRefundAmount = this.calculateItemRefundAmount(createRefundDto.items!, order);
        if (requestedRefundAmount > availableRefundAmount) {
          throw new BadRequestException(
            getRefundErrorMessage(RefundErrorCode.PARTIAL_REFUND_EXCEEDS_PAYMENT)
          );
        }
        break;
    }
    
    if (requestedRefundAmount <= 0) {
      throw new BadRequestException(getRefundErrorMessage(RefundErrorCode.INVALID_REFUND_AMOUNT));
    }
  }
  
  static validateRefundItems(items: CreateRefundItemDto[], order: any): void {
    if (!order.items || order.items.length === 0) {
      throw new BadRequestException('Order has no items to refund');
    }
    
    const orderItemsMap = new Map(order.items.map((item: any) => [item.id, item]));
    
    for (const refundItem of items) {
      const orderItem = orderItemsMap.get(refundItem.orderItemId);
      
      if (!orderItem) {
        throw new BadRequestException(`Order item ${refundItem.orderItemId} not found`);
      }
      
      // Check quantity limits
      const availableQuantity = (orderItem as any).quantity - ((orderItem as any).refundedQuantity || 0);
      if (refundItem.requestedQuantity > availableQuantity) {
        throw new BadRequestException(
          `Requested quantity ${refundItem.requestedQuantity} exceeds available quantity ${availableQuantity} for item ${(orderItem as any).sku}`
        );
      }
      
      if (refundItem.requestedQuantity <= 0) {
        throw new BadRequestException(`Invalid quantity ${refundItem.requestedQuantity} for item ${(orderItem as any).sku}`);
      }
    }
    
    // Check for duplicate items
    const itemIds = items.map(item => item.orderItemId);
    const uniqueItemIds = new Set(itemIds);
    if (itemIds.length !== uniqueItemIds.size) {
      throw new BadRequestException('Duplicate items found in refund request');
    }
  }
  
  static validateRefundWindow(order: any, refundWindowDays: number = 30): void {
    if (!order.deliveredAt && !order.confirmedAt) {
      return; // No delivery/confirmation date, allow refund
    }
    
    const referenceDate = order.deliveredAt || order.confirmedAt;
    const refundWindowEnd = new Date(referenceDate);
    refundWindowEnd.setDate(refundWindowEnd.getDate() + refundWindowDays);
    
    if (new Date() > refundWindowEnd) {
      throw new BadRequestException(getRefundErrorMessage(RefundErrorCode.REFUND_WINDOW_EXPIRED));
    }
  }
  
  // ============================================================================
  // REFUND STATUS TRANSITION VALIDATION
  // ============================================================================
  
  static validateStatusTransition(
    currentStatus: RefundStatus,
    newStatus: RefundStatus,
    refund?: Refund
  ): void {
    if (!canTransitionRefundStatus(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
    
    // Additional business rule validations
    if (newStatus === RefundStatus.PROCESSING && refund) {
      this.validateProcessingRequirements(refund);
    }
  }
  
  static validateProcessingRequirements(refund: Refund): void {
    if (refund.requiresApproval && refund.status !== RefundStatus.APPROVED) {
      throw new BadRequestException('Refund must be approved before processing');
    }
    
    if (!refund.gatewayRefundId && !refund.paymentTransactionId) {
      throw new BadRequestException('No payment transaction found for refund processing');
    }
  }
  
  // ============================================================================
  // REFUND APPROVAL VALIDATION
  // ============================================================================
  
  static validateRefundApproval(
    refund: Refund,
    approveRefundDto: ApproveRefundDto,
    approverId: string
  ): void {
    if (!refund.canBeApproved()) {
      throw new BadRequestException(`Refund cannot be approved in status: ${refund.status}`);
    }
    
    if (refund.createdBy === approverId) {
      throw new ForbiddenException('Cannot approve your own refund request');
    }
    
    // Validate approved amount
    if (approveRefundDto.approvedAmount) {
      if (approveRefundDto.approvedAmount > refund.requestedAmount) {
        throw new BadRequestException('Approved amount cannot exceed requested amount');
      }
      
      if (approveRefundDto.approvedAmount <= 0) {
        throw new BadRequestException('Approved amount must be greater than zero');
      }
    }
    
    // Validate approved items
    if (approveRefundDto.items && refund.isItemLevelRefund()) {
      this.validateApprovedItems(approveRefundDto.items, refund);
    }
  }
  
  static validateRefundRejection(
    refund: Refund,
    rejectRefundDto: RejectRefundDto,
    rejecterId: string
  ): void {
    if (!refund.canBeRejected()) {
      throw new BadRequestException(`Refund cannot be rejected in status: ${refund.status}`);
    }
    
    if (refund.createdBy === rejecterId) {
      throw new ForbiddenException('Cannot reject your own refund request');
    }
    
    if (!rejectRefundDto.rejectionReason || rejectRefundDto.rejectionReason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }
  }
  
  static validateApprovedItems(approvedItems: any[], refund: Refund): void {
    if (!refund.items || refund.items.length === 0) {
      throw new BadRequestException('No items found in refund to approve');
    }
    
    const refundItemsMap = new Map(refund.items.map(item => [item.id, item]));
    
    for (const approvedItem of approvedItems) {
      const refundItem = refundItemsMap.get(approvedItem.refundItemId);
      
      if (!refundItem) {
        throw new BadRequestException(`Refund item ${approvedItem.refundItemId} not found`);
      }
      
      if (approvedItem.approvedQuantity > refundItem.requestedQuantity) {
        throw new BadRequestException(
          `Approved quantity ${approvedItem.approvedQuantity} exceeds requested quantity ${refundItem.requestedQuantity}`
        );
      }
      
      if (approvedItem.approvedQuantity < 0) {
        throw new BadRequestException(`Approved quantity cannot be negative`);
      }
    }
  }
  
  // ============================================================================
  // REFUND PROCESSING VALIDATION
  // ============================================================================
  
  static validateRefundProcessing(refund: Refund): void {
    if (!refund.canBeProcessed()) {
      throw new BadRequestException(`Refund cannot be processed in status: ${refund.status}`);
    }
    
    if (refund.approvedAmount <= 0) {
      throw new BadRequestException('Cannot process refund with zero approved amount');
    }
    
    if (!refund.paymentTransactionId && !refund.paymentIntentId) {
      throw new BadRequestException('No payment reference found for refund processing');
    }
  }
  
  // ============================================================================
  // PERMISSION VALIDATION
  // ============================================================================
  
  static validateRefundPermissions(
    refund: Refund,
    userId: string,
    userRole: string,
    action: string
  ): void {
    switch (action) {
      case 'CREATE':
        // Customers can create refunds for their orders
        // Merchants can create refunds for their orders
        // Admins can create refunds for any order
        break;
        
      case 'APPROVE':
      case 'REJECT':
        // Only admins and authorized merchants can approve/reject
        if (userRole !== 'ADMIN' && userRole !== 'MERCHANT') {
          throw new ForbiddenException('Insufficient permissions to approve/reject refunds');
        }
        
        // Cannot approve/reject own refund
        if (refund.createdBy === userId) {
          throw new ForbiddenException('Cannot approve/reject your own refund');
        }
        break;
        
      case 'PROCESS':
        // Only admins and system can process refunds
        if (userRole !== 'ADMIN' && userRole !== 'SYSTEM') {
          throw new ForbiddenException('Insufficient permissions to process refunds');
        }
        break;
        
      case 'CANCEL':
        // Creator, admins, and authorized merchants can cancel
        if (refund.createdBy !== userId && userRole !== 'ADMIN' && userRole !== 'MERCHANT') {
          throw new ForbiddenException('Insufficient permissions to cancel refund');
        }
        break;
        
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }
  
  // ============================================================================
  // BUSINESS RULE VALIDATION
  // ============================================================================
  
  static validateBusinessRules(
    createRefundDto: CreateRefundDto,
    order: any,
    policy?: any
  ): void {
    // Validate against refund policy if provided
    if (policy) {
      this.validateRefundPolicy(createRefundDto, order, policy);
    }
    
    // Validate refund reason
    this.validateRefundReason(createRefundDto.reason, createRefundDto.refundCategory || RefundCategory.CUSTOMER_REQUEST);
    
    // Validate fraud checks
    this.validateFraudChecks(createRefundDto, order);
  }
  
  static validateRefundPolicy(
    createRefundDto: CreateRefundDto,
    order: any,
    policy: any
  ): void {
    if (!policy.isActive) {
      throw new BadRequestException('Refund policy is not active');
    }
    
    // Check refund type allowances
    switch (createRefundDto.refundType) {
      case RefundType.FULL:
        if (!policy.allowFullRefund) {
          throw new BadRequestException('Full refunds are not allowed by policy');
        }
        break;
      case RefundType.PARTIAL:
        if (!policy.allowPartialRefund) {
          throw new BadRequestException('Partial refunds are not allowed by policy');
        }
        break;
      case RefundType.ITEM_LEVEL:
        if (!policy.allowItemRefund) {
          throw new BadRequestException('Item-level refunds are not allowed by policy');
        }
        break;
    }
    
    // Check refund window
    if (policy.refundWindowDays) {
      this.validateRefundWindow(order, policy.refundWindowDays);
    }
    
    // Check auto-approval limits
    const refundAmount = this.calculateRefundAmount(createRefundDto, order);
    if (policy.autoApprovalLimit && refundAmount > policy.autoApprovalLimit) {
      // This will require manual approval
    }
  }
  
  static validateRefundReason(reason: RefundReason, category: string): void {
    // Validate reason-category consistency
    const customerReasons = [
      RefundReason.CUSTOMER_REQUEST,
      RefundReason.SIZE_FIT_ISSUE,
      RefundReason.NOT_AS_DESCRIBED,
    ];
    
    const merchantReasons = [
      RefundReason.MERCHANT_ERROR,
      RefundReason.GOODWILL_GESTURE,
    ];
    
    const systemReasons = [
      RefundReason.SYSTEM_ERROR,
      RefundReason.DUPLICATE_ORDER,
    ];
    
    // Add validation logic based on your business rules
  }
  
  static validateFraudChecks(createRefundDto: CreateRefundDto, order: any): void {
    // Implement fraud detection logic
    // - Check for excessive refund requests from same customer
    // - Check for suspicious patterns
    // - Validate against blacklists
    // This would typically integrate with a fraud detection service
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private static calculateItemRefundAmount(items: CreateRefundItemDto[], order: any): number {
    const orderItemsMap = new Map(order.items.map((item: any) => [item.id, item]));
    
    return items.reduce((total, refundItem) => {
      const orderItem = orderItemsMap.get(refundItem.orderItemId);
      if (orderItem) {
        return total + ((orderItem as any).unitPrice * refundItem.requestedQuantity);
      }
      return total;
    }, 0);
  }
  
  private static calculateRefundAmount(createRefundDto: CreateRefundDto, order: any): number {
    switch (createRefundDto.refundType) {
      case RefundType.FULL:
        return order.totalAmount;
      case RefundType.PARTIAL:
        return createRefundDto.requestedAmount!;
      case RefundType.ITEM_LEVEL:
        return this.calculateItemRefundAmount(createRefundDto.items!, order);
      default:
        return 0;
    }
  }
}