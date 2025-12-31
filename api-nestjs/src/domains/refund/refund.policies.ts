import {
  RefundStatus,
  RefundType,
  RefundReason,
  RefundCategory,
  shouldRequireApproval,
  getRefundPriority,
} from './enums/refund-status.enum';
import { Refund } from './entities/refund.entity';

export class RefundPolicies {
  // ============================================================================
  // ACCESS CONTROL POLICIES
  // ============================================================================

  static canCreateRefund(
    orderId: string,
    userId: string,
    userRole: string,
    order?: any,
  ): boolean {
    switch (userRole) {
      case 'ADMIN':
        return true;

      case 'CUSTOMER':
        // Customers can only create refunds for their own orders
        return order?.customerId === userId;

      case 'MERCHANT':
        // Merchants can create refunds for orders they're selling
        return (
          order?.items?.some((item: any) => item.sellerId === userId) || false
        );

      case 'SUPPORT':
        // Support can create refunds for any order
        return true;

      default:
        return false;
    }
  }

  static canViewRefund(
    refund: Refund,
    userId: string,
    userRole: string,
    order?: any,
  ): boolean {
    switch (userRole) {
      case 'ADMIN':
      case 'SUPPORT':
        return true;

      case 'CUSTOMER':
        // Customers can view refunds for their orders
        return order?.customerId === userId || refund.createdBy === userId;

      case 'MERCHANT':
        // Merchants can view refunds for their orders
        return (
          order?.items?.some((item: any) => item.sellerId === userId) || false
        );

      default:
        return false;
    }
  }

  static canUpdateRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    // Only pending refunds can be updated
    if (refund.status !== RefundStatus.PENDING) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
        return true;

      case 'CUSTOMER':
      case 'MERCHANT':
        // Only creator can update pending refunds
        return refund.createdBy === userId;

      default:
        return false;
    }
  }

  static canApproveRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    // Cannot approve own refund
    if (refund.createdBy === userId) {
      return false;
    }

    // Only pending refunds can be approved
    if (refund.status !== RefundStatus.PENDING) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
      case 'SUPPORT':
        return true;

      case 'MERCHANT':
        // Merchants can approve refunds for their orders (if policy allows)
        return this.canMerchantApproveRefund(refund);

      default:
        return false;
    }
  }

  static canRejectRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    // Cannot reject own refund
    if (refund.createdBy === userId) {
      return false;
    }

    // Only pending refunds can be rejected
    if (refund.status !== RefundStatus.PENDING) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
      case 'SUPPORT':
        return true;

      case 'MERCHANT':
        // Merchants can reject refunds for their orders (if policy allows)
        return this.canMerchantRejectRefund(refund);

      default:
        return false;
    }
  }

  static canProcessRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    // Only approved refunds can be processed
    if (refund.status !== RefundStatus.APPROVED) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
      case 'SYSTEM':
        return true;

      case 'SUPPORT':
        // Support can process refunds below certain threshold
        return refund.approvedAmount <= this.getSupportProcessingLimit();

      default:
        return false;
    }
  }

  static canCancelRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    // Cannot cancel completed or already cancelled refunds
    if (refund.isTerminal()) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
        return true;

      case 'CUSTOMER':
      case 'MERCHANT':
        // Creator can cancel pending or approved refunds
        return refund.createdBy === userId && refund.canBeCancelled();

      default:
        return false;
    }
  }

  static canRetryRefund(
    refund: Refund,
    userId: string,
    userRole: string,
  ): boolean {
    if (!refund.canBeRetried()) {
      return false;
    }

    switch (userRole) {
      case 'ADMIN':
      case 'SYSTEM':
        return true;

      default:
        return false;
    }
  }

  // ============================================================================
  // BUSINESS RULE POLICIES
  // ============================================================================

  static shouldRequireApproval(
    refundAmount: number,
    refundReason: RefundReason,
    refundType: RefundType,
    refundCategory: RefundCategory,
    policy?: any,
  ): boolean {
    // System-initiated refunds don't require approval
    if (refundCategory === RefundCategory.SYSTEM_INITIATED) {
      return false;
    }

    // Fraud/dispute cases always require approval
    if (
      refundReason === RefundReason.FRAUDULENT_TRANSACTION ||
      refundReason === RefundReason.PAYMENT_DISPUTE
    ) {
      return true;
    }

    // Check policy auto-approval limit
    if (policy?.autoApprovalLimit && refundAmount <= policy.autoApprovalLimit) {
      return false;
    }

    // Use default business rules
    return shouldRequireApproval(
      refundAmount,
      refundReason,
      refundType,
      policy?.autoApprovalLimit,
    );
  }

  static getRefundPriority(
    refund: Refund,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    return getRefundPriority(refund.refundType, refund.requestedAmount);
  }

  static shouldRestockInventory(
    refund: Refund,
    refundReason: RefundReason,
  ): boolean {
    // Don't restock for certain reasons
    const noRestockReasons = [
      RefundReason.DEFECTIVE_PRODUCT,
      RefundReason.DAMAGED_IN_SHIPPING,
      RefundReason.QUALITY_ISSUE,
      RefundReason.FRAUDULENT_TRANSACTION,
    ];

    if (noRestockReasons.includes(refundReason)) {
      return false;
    }

    // Only restock for item-level and full refunds
    return (
      refund.refundType === RefundType.ITEM_LEVEL ||
      refund.refundType === RefundType.FULL
    );
  }

  static getMaxRefundAmount(
    order: any,
    existingRefunds: Refund[] = [],
  ): number {
    const totalOrderAmount = order.totalAmount || 0;
    const totalRefundedAmount = existingRefunds
      .filter((r) => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || 0), 0);

    return Math.max(0, totalOrderAmount - totalRefundedAmount);
  }

  static isRefundEligible(
    order: any,
    refundWindowDays: number = 30,
  ): { eligible: boolean; reason?: string; maxAmount?: number } {
    // Check order status
    const eligibleStatuses = [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    if (!eligibleStatuses.includes(order.status)) {
      return {
        eligible: false,
        reason: `Order status '${order.status}' is not eligible for refund`,
      };
    }

    // Check payment status
    const hasSuccessfulPayment = order.payments?.some(
      (p: any) => p.status === 'COMPLETED',
    );
    if (!hasSuccessfulPayment) {
      return {
        eligible: false,
        reason: 'No successful payment found for this order',
      };
    }

    // Check refund window
    if (order.deliveredAt || order.confirmedAt) {
      const referenceDate = order.deliveredAt || order.confirmedAt;
      const refundWindowEnd = new Date(referenceDate);
      refundWindowEnd.setDate(refundWindowEnd.getDate() + refundWindowDays);

      if (new Date() > refundWindowEnd) {
        return {
          eligible: false,
          reason: `Refund window of ${refundWindowDays} days has expired`,
        };
      }
    }

    // Check available refund amount
    const maxAmount = this.getMaxRefundAmount(order, order.refunds || []);
    if (maxAmount <= 0) {
      return {
        eligible: false,
        reason: 'Order has already been fully refunded',
      };
    }

    return {
      eligible: true,
      maxAmount,
    };
  }

  static getRefundFees(
    refundAmount: number,
    refundReason: RefundReason,
    policy?: any,
  ): { refundFee: number; restockingFee: number; totalFees: number } {
    let refundFeePercent = policy?.refundFeePercent || 0;
    let refundFeeFixed = policy?.refundFeeFixed || 0;
    let restockingFee = policy?.restockingFee || 0;

    // No fees for merchant errors or defective products
    if (
      refundReason === RefundReason.MERCHANT_ERROR ||
      refundReason === RefundReason.DEFECTIVE_PRODUCT ||
      refundReason === RefundReason.WRONG_ITEM
    ) {
      refundFeePercent = 0;
      refundFeeFixed = 0;
      restockingFee = 0;
    }

    const refundFee =
      Math.round((refundAmount * refundFeePercent) / 100) + refundFeeFixed;
    const totalFees = refundFee + restockingFee;

    return {
      refundFee,
      restockingFee,
      totalFees,
    };
  }

  static shouldSendNotification(
    refund: Refund,
    eventType: string,
  ): { shouldSend: boolean; channels: string[] } {
    const channels: string[] = [];

    // Always send email notifications for refund events
    channels.push('EMAIL');

    // Send SMS for high-value refunds
    if (refund.requestedAmount > 10000000) {
      // ₹1,00,000
      channels.push('SMS');
    }

    // Send push notifications for mobile app users
    channels.push('PUSH');

    // Send webhook notifications for merchants
    if (refund.refundCategory === RefundCategory.MERCHANT_INITIATED) {
      channels.push('WEBHOOK');
    }

    return {
      shouldSend: channels.length > 0,
      channels,
    };
  }

  // ============================================================================
  // FRAUD DETECTION POLICIES
  // ============================================================================

  static detectRefundFraud(
    refund: Refund,
    customerRefundHistory: Refund[] = [],
  ): { isFraudulent: boolean; score: number; reasons: string[] } {
    let fraudScore = 0;
    const reasons: string[] = [];

    // Check refund frequency
    const recentRefunds = customerRefundHistory.filter((r) => {
      const daysDiff =
        (new Date().getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    if (recentRefunds.length > 5) {
      fraudScore += 30;
      reasons.push('Excessive refund requests in last 30 days');
    }

    // Check refund amount patterns
    const totalRefundAmount = customerRefundHistory
      .filter((r) => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.processedAmount || 0), 0);

    if (totalRefundAmount > 50000000) {
      // ₹5,00,000
      fraudScore += 25;
      reasons.push('High total refund amount');
    }

    // Check refund reasons
    const suspiciousReasons = [
      RefundReason.NOT_AS_DESCRIBED,
      RefundReason.DEFECTIVE_PRODUCT,
    ];

    const suspiciousRefunds = customerRefundHistory.filter((r) =>
      suspiciousReasons.includes(r.reason),
    );

    if (suspiciousRefunds.length > 3) {
      fraudScore += 20;
      reasons.push('Multiple refunds for suspicious reasons');
    }

    // Check timing patterns (immediate refunds after delivery)
    if (refund.reason === RefundReason.CUSTOMER_REQUEST) {
      // This would require order delivery date comparison
      // fraudScore += 15;
      // reasons.push('Immediate refund after delivery');
    }

    return {
      isFraudulent: fraudScore >= 50,
      score: fraudScore,
      reasons,
    };
  }

  static shouldBlockRefund(
    refund: Refund,
    fraudResult: { isFraudulent: boolean; score: number; reasons: string[] },
  ): boolean {
    // Block if fraud score is very high
    if (fraudResult.score >= 80) {
      return true;
    }

    // Block if multiple fraud indicators
    if (fraudResult.reasons.length >= 3) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static canMerchantApproveRefund(refund: Refund): boolean {
    // Merchants can approve refunds below certain threshold
    const merchantApprovalLimit = 5000000; // ₹50,000
    return refund.requestedAmount <= merchantApprovalLimit;
  }

  private static canMerchantRejectRefund(refund: Refund): boolean {
    // Merchants can reject refunds with valid business reasons
    const validReasons = [
      RefundReason.CUSTOMER_REQUEST,
      RefundReason.SIZE_FIT_ISSUE,
    ];

    return validReasons.includes(refund.reason);
  }

  private static getSupportProcessingLimit(): number {
    return 2500000; // ₹25,000
  }

  // ============================================================================
  // CONFIGURATION POLICIES
  // ============================================================================

  static getDefaultRefundPolicy(): any {
    return {
      refundWindowDays: 30,
      allowFullRefund: true,
      allowPartialRefund: true,
      allowItemRefund: true,
      requiresApproval: true,
      autoApprovalLimit: 500000, // ₹5,000
      refundFeePercent: 0,
      refundFeeFixed: 0,
      restockingFee: 0,
      maxRetries: 3,
    };
  }

  static getRefundLimits(): any {
    return {
      maxDailyRefunds: 10,
      maxMonthlyRefundAmount: 100000000, // ₹10,00,000
      maxSingleRefundAmount: 50000000, // ₹5,00,000
      minRefundAmount: 100, // ₹1
    };
  }

  static getNotificationSettings(): any {
    return {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      webhookEnabled: true,
      highValueThreshold: 10000000, // ₹1,00,000
      fraudAlertThreshold: 50, // Fraud score
    };
  }
}
