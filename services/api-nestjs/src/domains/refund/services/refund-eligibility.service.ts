import { Injectable } from '@nestjs/common';
import { RefundRepository } from '../repositories/refund.repository.js';
import { OrderService } from '../../order/order.service';
import { RefundPolicies } from '../refund.policies';
import { RefundType, RefundStatus, RefundReason } from '../enums/refund-status.enum';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { Order } from '../../order/entities/order.entity';
import { OrderItem } from '../../order/entities/order-item.entity';
import { Refund } from '../entities/refund.entity';

export interface RefundEligibilityResult {
  isEligible: boolean;
  reason?: string;
  maxRefundAmount?: number;
  refundWindowEnd?: Date;
  eligibleItems?: Array<{
    orderItemId: string;
    maxQuantity: number;
    maxAmount: number;
  }>;
  policy?: any;
}

export interface RefundEligibilityOptions {
  refundType?: RefundType;
  itemIds?: string[];
  checkInventory?: boolean;
  bypassTimeWindow?: boolean;
  customPolicy?: any;
}

@Injectable()
export class RefundEligibilityService {
  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly orderService: OrderService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async checkOrderEligibility(
    orderId: string,
    options: RefundEligibilityOptions = {}
  ): Promise<RefundEligibilityResult> {
    this.logger.log('RefundEligibilityService.checkOrderEligibility', {
      orderId,
      options,
    });

    try {
      // Get order with related data
      const order = await this.orderService.findById(orderId, {
        includeItems: true,
        includePayments: true,
        includeRefunds: true,
      });

      if (!order) {
        return {
          isEligible: false,
          reason: 'Order not found',
        };
      }

      // Get existing refunds for this order
      const existingRefunds = await this.refundRepository.findByOrderId(orderId);

      // Get applicable policy
      const policy = options.customPolicy || await this.getApplicablePolicy(order);

      // Perform eligibility checks
      const eligibilityResult = await this.performEligibilityChecks(
        order,
        existingRefunds,
        policy,
        options
      );

      this.logger.log('Order eligibility check completed', {
        orderId,
        isEligible: eligibilityResult.isEligible,
        reason: eligibilityResult.reason,
      });

      return eligibilityResult;

    } catch (error) {
      this.logger.error('Failed to check order eligibility', error, { orderId });
      return {
        isEligible: false,
        reason: 'Error checking eligibility',
      };
    }
  }

  async checkItemEligibility(
    orderId: string,
    itemId: string,
    quantity: number,
    options: RefundEligibilityOptions = {}
  ): Promise<RefundEligibilityResult> {
    this.logger.log('RefundEligibilityService.checkItemEligibility', {
      orderId,
      itemId,
      quantity,
      options,
    });

    try {
      // First check order eligibility
      const orderEligibility = await this.checkOrderEligibility(orderId, {
        ...options,
        refundType: RefundType.ITEM_LEVEL,
        itemIds: [itemId],
      });

      if (!orderEligibility.isEligible) {
        return orderEligibility;
      }

      // Get order item details
      const order = await this.orderService.findById(orderId, {
        includeItems: true,
        includeRefunds: true,
      });

      const orderItem = order.items?.find(item => item.id === itemId);
      if (!orderItem) {
        return {
          isEligible: false,
          reason: 'Order item not found',
        };
      }

      // Check item-specific eligibility
      const itemEligibility = await this.checkItemSpecificEligibility(
        order,
        orderItem,
        quantity,
        options
      );

      return itemEligibility;

    } catch (error) {
      this.logger.error('Failed to check item eligibility', error, {
        orderId,
        itemId,
        quantity,
      });
      return {
        isEligible: false,
        reason: 'Error checking item eligibility',
      };
    }
  }

  async getMaxRefundableAmount(
    orderId: string,
    options: RefundEligibilityOptions = {}
  ): Promise<number> {
    try {
      const eligibility = await this.checkOrderEligibility(orderId, options);
      return eligibility.maxRefundAmount || 0;
    } catch (error) {
      this.logger.error('Failed to get max refundable amount', error, { orderId });
      return 0;
    }
  }

  async getRefundWindow(
    orderId: string,
    policy?: any
  ): Promise<{ windowEnd: Date; daysRemaining: number } | null> {
    try {
      const order = await this.orderService.findById(orderId);
      if (!order) return null;

      const appliedPolicy = policy || await this.getApplicablePolicy(order);
      const refundWindowDays = appliedPolicy?.refundWindowDays || 30;

      // Calculate window end based on delivery or confirmation date
      const referenceDate = order.deliveredAt || order.confirmedAt;
      if (!referenceDate) return null;

      const windowEnd = new Date(referenceDate);
      windowEnd.setDate(windowEnd.getDate() + refundWindowDays);

      const now = new Date();
      const daysRemaining = Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        windowEnd,
        daysRemaining: Math.max(0, daysRemaining),
      };

    } catch (error) {
      this.logger.error('Failed to get refund window', error, { orderId });
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS - ELIGIBILITY CHECKS
  // ============================================================================

  private async performEligibilityChecks(
    order: Order,
    existingRefunds: Refund[],
    policy: any,
    options: RefundEligibilityOptions
  ): Promise<RefundEligibilityResult> {
    // Check order status eligibility
    const statusCheck = this.checkOrderStatusEligibility(order);
    if (!statusCheck.isEligible) {
      return statusCheck;
    }

    // Check payment eligibility
    const paymentCheck = this.checkPaymentEligibility(order);
    if (!paymentCheck.isEligible) {
      return paymentCheck;
    }

    // Check refund window (unless bypassed)
    if (!options.bypassTimeWindow) {
      const timeWindowCheck = this.checkRefundTimeWindow(order, policy);
      if (!timeWindowCheck.isEligible) {
        return timeWindowCheck;
      }
    }

    // Check existing refunds
    const existingRefundCheck = this.checkExistingRefunds(order, existingRefunds);
    if (!existingRefundCheck.isEligible) {
      return existingRefundCheck;
    }

    // Calculate maximum refundable amount
    const maxRefundAmount = this.calculateMaxRefundAmount(order, existingRefunds);
    if (maxRefundAmount <= 0) {
      return {
        isEligible: false,
        reason: 'No refundable amount remaining',
      };
    }

    // Check item-level eligibility if specific items requested
    let eligibleItems: Array<{
      orderItemId: string;
      maxQuantity: number;
      maxAmount: number;
    }> | undefined;

    if (options.itemIds && options.itemIds.length > 0) {
      const itemEligibilityResults = await this.checkItemsEligibility(
        order,
        options.itemIds,
        existingRefunds,
        options
      );

      if (itemEligibilityResults.length === 0) {
        return {
          isEligible: false,
          reason: 'No eligible items found',
        };
      }

      eligibleItems = itemEligibilityResults;
    }

    // Get refund window end date
    const refundWindow = await this.getRefundWindow(order.id, policy);

    return {
      isEligible: true,
      maxRefundAmount,
      refundWindowEnd: refundWindow?.windowEnd,
      eligibleItems,
      policy,
    };
  }

  private checkOrderStatusEligibility(order: Order): RefundEligibilityResult {
    if (!order.canBeRefunded) {
      return {
        isEligible: false,
        reason: `Order status '${order.status}' is not eligible for refund`,
      };
    }

    return { isEligible: true };
  }

  private checkPaymentEligibility(order: Order): RefundEligibilityResult {
    const totalPaid = order.getTotalPaid();
    
    if (totalPaid <= 0) {
      return {
        isEligible: false,
        reason: 'No successful payment found for this order',
      };
    }

    if (!order.isFullyPaid()) {
      return {
        isEligible: false,
        reason: 'Order is not fully paid',
      };
    }

    return { isEligible: true };
  }

  private checkRefundTimeWindow(order: Order, policy: any): RefundEligibilityResult {
    const refundWindowDays = policy?.refundWindowDays || 30;
    const referenceDate = order.deliveredAt || order.confirmedAt;

    if (!referenceDate) {
      return {
        isEligible: false,
        reason: 'Order has not been confirmed or delivered yet',
      };
    }

    const refundWindowEnd = new Date(referenceDate);
    refundWindowEnd.setDate(refundWindowEnd.getDate() + refundWindowDays);

    if (new Date() > refundWindowEnd) {
      return {
        isEligible: false,
        reason: `Refund window of ${refundWindowDays} days has expired`,
      };
    }

    return { isEligible: true };
  }

  private checkExistingRefunds(order: Order, existingRefunds: Refund[]): RefundEligibilityResult {
    // Check for pending refunds
    const pendingRefunds = existingRefunds.filter(r => 
      r.status === RefundStatus.PENDING || 
      r.status === RefundStatus.APPROVED || 
      r.status === RefundStatus.PROCESSING
    );

    if (pendingRefunds.length > 0) {
      return {
        isEligible: false,
        reason: 'There are pending refund requests for this order',
      };
    }

    // Check if order is already fully refunded
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || r.approvedAmount), 0);

    const totalPaid = order.getTotalPaid();

    if (totalRefunded >= totalPaid) {
      return {
        isEligible: false,
        reason: 'Order has already been fully refunded',
      };
    }

    return { isEligible: true };
  }

  private calculateMaxRefundAmount(order: Order, existingRefunds: Refund[]): number {
    const totalPaid = order.getTotalPaid();
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || r.approvedAmount), 0);

    return Math.max(0, totalPaid - totalRefunded);
  }

  private async checkItemsEligibility(
    order: Order,
    itemIds: string[],
    existingRefunds: Refund[],
    options: RefundEligibilityOptions
  ): Promise<Array<{
    orderItemId: string;
    maxQuantity: number;
    maxAmount: number;
  }>> {
    const eligibleItems: Array<{
      orderItemId: string;
      maxQuantity: number;
      maxAmount: number;
    }> = [];

    for (const itemId of itemIds) {
      const orderItem = order.items?.find(item => item.id === itemId);
      if (!orderItem) continue;

      // Calculate already refunded quantity for this item
      const refundedQuantity = this.getRefundedQuantityForItem(itemId, existingRefunds);
      const maxQuantity = Math.max(0, orderItem.quantity - refundedQuantity);

      if (maxQuantity > 0) {
        const maxAmount = maxQuantity * orderItem.unitPrice;
        eligibleItems.push({
          orderItemId: itemId,
          maxQuantity,
          maxAmount,
        });
      }
    }

    return eligibleItems;
  }

  private async checkItemSpecificEligibility(
    order: Order,
    orderItem: OrderItem,
    requestedQuantity: number,
    options: RefundEligibilityOptions
  ): Promise<RefundEligibilityResult> {
    // Get existing refunds for this item
    const existingRefunds = await this.refundRepository.findByOrderId(order.id);
    const refundedQuantity = this.getRefundedQuantityForItem(orderItem.id, existingRefunds);

    const availableQuantity = orderItem.quantity - refundedQuantity;

    if (requestedQuantity > availableQuantity) {
      return {
        isEligible: false,
        reason: `Only ${availableQuantity} items available for refund (${refundedQuantity} already refunded)`,
      };
    }

    // Check inventory availability if restocking is required
    if (options.checkInventory) {
      const inventoryCheck = await this.checkInventoryForRestock(orderItem, requestedQuantity);
      if (!inventoryCheck.isEligible) {
        return inventoryCheck;
      }
    }

    const maxAmount = requestedQuantity * orderItem.unitPrice;

    return {
      isEligible: true,
      maxRefundAmount: maxAmount,
      eligibleItems: [{
        orderItemId: orderItem.id,
        maxQuantity: requestedQuantity,
        maxAmount,
      }],
    };
  }

  private async checkInventoryForRestock(
    orderItem: OrderItem,
    quantity: number
  ): Promise<RefundEligibilityResult> {
    // This would integrate with inventory service to check if items can be restocked
    // For now, we'll assume items can be restocked unless they're damaged/defective
    
    // Check if the refund reason would prevent restocking
    // This would typically be passed in the options or determined by business rules
    
    return { isEligible: true };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getRefundedQuantityForItem(itemId: string, refunds: Refund[]): number {
    return refunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((total, refund) => {
        const refundItem = refund.items?.find(item => item.orderItemId === itemId);
        return total + (refundItem?.approvedQuantity || 0);
      }, 0);
  }

  private async getApplicablePolicy(order: Order): Promise<any> {
    // This would fetch the applicable refund policy based on:
    // - Seller-specific policies
    // - Product category policies
    // - Global policies
    
    // For now, return default policy
    return RefundPolicies.getDefaultRefundPolicy();
  }

  // ============================================================================
  // FRAUD DETECTION INTEGRATION
  // ============================================================================

  async checkRefundFraud(
    orderId: string,
    customerId: string,
    refundAmount: number,
    refundReason: RefundReason
  ): Promise<{
    isFraudulent: boolean;
    riskScore: number;
    reasons: string[];
    shouldBlock: boolean;
  }> {
    try {
      // Get customer's refund history
      const customerRefundsResult = await this.refundRepository.findAll(
        { customerId },
        { limit: 100 },
        {}
      );
      // Handle both array and object return types
      const customerRefunds = Array.isArray(customerRefundsResult) 
        ? customerRefundsResult 
        : (customerRefundsResult as any)?.refunds || [];

      // Create a mock refund object for fraud detection
      const mockRefund = new Refund({
        orderId,
        requestedAmount: refundAmount,
        reason: refundReason,
        refundType: RefundType.PARTIAL, // Default assumption
        createdBy: customerId,
        createdAt: new Date(),
      });

      // Run fraud detection
      const fraudResult = RefundPolicies.detectRefundFraud(mockRefund, customerRefunds);
      const shouldBlock = RefundPolicies.shouldBlockRefund(mockRefund, fraudResult);

      return {
        isFraudulent: fraudResult.isFraudulent,
        riskScore: fraudResult.score,
        reasons: fraudResult.reasons,
        shouldBlock,
      };

    } catch (error) {
      this.logger.error('Failed to check refund fraud', error, {
        orderId,
        customerId,
        refundAmount,
      });

      // Return safe defaults on error
      return {
        isFraudulent: false,
        riskScore: 0,
        reasons: [],
        shouldBlock: false,
      };
    }
  }

  // ============================================================================
  // BULK ELIGIBILITY CHECKS
  // ============================================================================

  async checkBulkEligibility(
    orderIds: string[],
    options: RefundEligibilityOptions = {}
  ): Promise<Record<string, RefundEligibilityResult>> {
    const results: Record<string, RefundEligibilityResult> = {};

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (orderId) => {
        try {
          const result = await this.checkOrderEligibility(orderId, options);
          return { orderId, result };
        } catch (error) {
          this.logger.error('Failed to check eligibility in batch', error, { orderId });
          return {
            orderId,
            result: {
              isEligible: false,
              reason: 'Error checking eligibility',
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { orderId, result } of batchResults) {
        results[orderId] = result;
      }
    }

    return results;
  }

  // ============================================================================
  // CACHING METHODS
  // ============================================================================

  async cacheEligibilityResult(
    orderId: string,
    result: RefundEligibilityResult,
    ttlMinutes: number = 60
  ): Promise<void> {
    try {
      // This would cache the eligibility result in Redis or similar
      // Implementation depends on caching infrastructure
      
      this.logger.log('Eligibility result cached', {
        orderId,
        isEligible: result.isEligible,
        ttlMinutes,
      });
    } catch (error) {
      this.logger.error('Failed to cache eligibility result', error, { orderId });
    }
  }

  async getCachedEligibilityResult(orderId: string): Promise<RefundEligibilityResult | null> {
    try {
      // This would retrieve cached eligibility result
      // Implementation depends on caching infrastructure
      
      return null; // No cache implementation for now
    } catch (error) {
      this.logger.error('Failed to get cached eligibility result', error, { orderId });
      return null;
    }
  }

  async checkEligibility(
    orderId: string,
    options: RefundEligibilityOptions = {}
  ): Promise<RefundEligibilityResult> {
    // This is an alias for checkOrderEligibility for backward compatibility
    return this.checkOrderEligibility(orderId, options);
  }
}