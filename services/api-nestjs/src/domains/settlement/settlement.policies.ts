import { UserRole } from '../../common/types';
import { SettlementStatus, SellerAccountStatus } from './enums/settlement-status.enum';

export class SettlementPolicies {
  // ============================================================================
  // SETTLEMENT ACCESS POLICIES
  // ============================================================================

  static canAccess(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // System admin can access all settlements
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Finance team can access all settlements
    if (userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can only access their own settlements
    if (userRole === UserRole.SELLER) {
      return settlement.sellerId === userId;
    }

    // Support team can access settlements for investigation
    if (userRole === UserRole.SUPPORT) {
      return true;
    }

    // Customer service can view settlements (read-only)
    if (userRole === UserRole.CUSTOMER_SERVICE) {
      return true;
    }

    return false;
  }

  static canCreate(userId?: string, userRole?: UserRole): boolean {
    // Only admin, finance, and system can create settlements
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE ||
           userRole === UserRole.SYSTEM;
  }

  static canProcess(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // Only finance team and admin can process settlements
    if (userRole !== UserRole.FINANCE && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      return false;
    }

    // Settlement must be in processable state
    return settlement.status === SettlementStatus.PENDING;
  }

  static canCancel(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // Only admin and finance can cancel settlements
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.FINANCE) {
      return false;
    }

    // Can only cancel pending or processing settlements
    return settlement.status === SettlementStatus.PENDING || 
           settlement.status === SettlementStatus.PROCESSING;
  }

  static canRetry(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // Only admin and finance can retry failed settlements
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.FINANCE) {
      return false;
    }

    // Can only retry failed settlements
    return settlement.status === SettlementStatus.FAILED;
  }

  static canViewDetails(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // Same as access policy but with additional restrictions
    if (!this.canAccess(settlement, userId, userRole)) {
      return false;
    }

    // Sellers can view their own settlement details
    if (userRole === UserRole.SELLER) {
      return settlement.sellerId === userId;
    }

    // Admin, finance, and support can view all details
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE || 
           userRole === UserRole.SUPPORT;
  }

  static canViewTransactions(settlement: any, userId?: string, userRole?: UserRole): boolean {
    // More restrictive than viewing settlement details
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can view their own settlement transactions
    if (userRole === UserRole.SELLER) {
      return settlement.sellerId === userId;
    }

    // Support can view for investigation purposes
    if (userRole === UserRole.SUPPORT) {
      return true;
    }

    return false;
  }

  static canAccessSellerSettlements(sellerId: string, userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can access all seller settlements
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can only access their own settlements
    if (userRole === UserRole.SELLER) {
      return sellerId === userId;
    }

    // Support can access for investigation
    if (userRole === UserRole.SUPPORT) {
      return true;
    }

    return false;
  }

  // ============================================================================
  // SELLER ACCOUNT ACCESS POLICIES
  // ============================================================================

  static canAccessSellerAccount(sellerAccount: any, userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can access all seller accounts
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can access their own account
    if (userRole === UserRole.SELLER) {
      return sellerAccount.sellerId === userId;
    }

    // Support can access for investigation
    if (userRole === UserRole.SUPPORT) {
      return true;
    }

    return false;
  }

  static canCreateSellerAccount(userId?: string, userRole?: UserRole): boolean {
    // Admin, finance, and sellers can create seller accounts
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE ||
           userRole === UserRole.SELLER;
  }

  static canUpdateSellerAccount(sellerAccount: any, userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can update any seller account
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can update their own account (with restrictions)
    if (userRole === UserRole.SELLER && sellerAccount.sellerId === userId) {
      // Sellers can only update if account is not yet activated
      return sellerAccount.status !== SellerAccountStatus.ACTIVATED;
    }

    return false;
  }

  static canUpdateSellerAccountStatus(sellerAccount: any, userId?: string, userRole?: UserRole): boolean {
    // Only admin and finance can update seller account status
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE;
  }

  static canViewSellerAccountDetails(sellerAccount: any, userId?: string, userRole?: UserRole): boolean {
    return this.canAccessSellerAccount(sellerAccount, userId, userRole);
  }

  static canViewBankDetails(sellerAccount: any, userId?: string, userRole?: UserRole): boolean {
    // More restrictive access to bank details
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can view their own bank details
    if (userRole === UserRole.SELLER) {
      return sellerAccount.sellerId === userId;
    }

    return false;
  }

  // ============================================================================
  // SETTLEMENT SCHEDULE POLICIES
  // ============================================================================

  static canUpdateSettlementSchedule(sellerId: string, userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can update any schedule
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE) {
      return true;
    }

    // Sellers can update their own schedule
    if (userRole === UserRole.SELLER) {
      return sellerId === userId;
    }

    return false;
  }

  static canViewSettlementSchedule(sellerId: string, userId?: string, userRole?: UserRole): boolean {
    return this.canAccessSellerSettlements(sellerId, userId, userRole);
  }

  // ============================================================================
  // AUDIT LOG POLICIES
  // ============================================================================

  static canViewAuditLogs(userId?: string, userRole?: UserRole): boolean {
    // Only admin, finance, and support can view audit logs
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE || 
           userRole === UserRole.SUPPORT;
  }

  static canViewSellerAuditLogs(sellerId: string, userId?: string, userRole?: UserRole): boolean {
    // Admin, finance, and support can view all audit logs
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN || userRole === UserRole.FINANCE || userRole === UserRole.SUPPORT) {
      return true;
    }

    // Sellers can view their own audit logs (limited)
    if (userRole === UserRole.SELLER) {
      return sellerId === userId;
    }

    return false;
  }

  // ============================================================================
  // REPORTING POLICIES
  // ============================================================================

  static canGenerateReports(userId?: string, userRole?: UserRole): boolean {
    // Admin, finance, and support can generate reports
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE || 
           userRole === UserRole.SUPPORT;
  }

  static canViewFinancialReports(userId?: string, userRole?: UserRole): boolean {
    // Only admin and finance can view financial reports
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE;
  }

  static canExportData(userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can export settlement data
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE;
  }

  // ============================================================================
  // BUSINESS RULE POLICIES
  // ============================================================================

  static canProcessSettlementAmount(amount: number, sellerTier: string): boolean {
    // Maximum settlement amount limits by seller tier
    const maxAmounts: Record<string, number> = {
      'STANDARD': 10000000,    // ₹1,00,000
      'PREMIUM': 50000000,     // ₹5,00,000
      'ENTERPRISE': 100000000, // ₹10,00,000
    };

    const maxAmount = maxAmounts[sellerTier] || maxAmounts['STANDARD'];
    return amount <= maxAmount;
  }

  static canProcessSettlementFrequency(
    lastSettlementDate: Date | null,
    frequency: string,
    sellerTier: string
  ): boolean {
    if (!lastSettlementDate) {
      return true; // First settlement
    }

    const now = new Date();
    const daysSinceLastSettlement = Math.ceil(
      (now.getTime() - lastSettlementDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Minimum days between settlements by tier
    const minDaysByTier: Record<string, Record<string, number>> = {
      'STANDARD': { 'DAILY': 1, 'WEEKLY': 7, 'MONTHLY': 30 },
      'PREMIUM': { 'DAILY': 1, 'WEEKLY': 7, 'MONTHLY': 30 },
      'ENTERPRISE': { 'DAILY': 1, 'WEEKLY': 7, 'MONTHLY': 30 },
    };

    const minDays = minDaysByTier[sellerTier]?.[frequency] || 1;
    return daysSinceLastSettlement >= minDays;
  }

  static canBypassHoldPeriod(userId?: string, userRole?: UserRole): boolean {
    // Only super admin can bypass hold periods
    return userRole === UserRole.SUPER_ADMIN;
  }

  static canProcessManualSettlement(userId?: string, userRole?: UserRole): boolean {
    // Admin and finance can process manual settlements
    return userRole === UserRole.ADMIN || 
           userRole === UserRole.SUPER_ADMIN || 
           userRole === UserRole.FINANCE;
  }

  // ============================================================================
  // RISK MANAGEMENT POLICIES
  // ============================================================================

  static requiresApproval(settlement: any, sellerAccount: any): boolean {
    // Large settlements require approval
    if (settlement.netAmount > 5000000) { // ₹50,000
      return true;
    }

    // High-risk sellers require approval
    if (sellerAccount.riskProfile === 'HIGH') {
      return true;
    }

    // New sellers require approval for first few settlements
    if (sellerAccount.settlementCount < 5) {
      return true;
    }

    // Settlements with high fee percentage require approval
    const feePercentage = (settlement.fees / settlement.grossAmount) * 100;
    if (feePercentage > 10) { // More than 10% fees
      return true;
    }

    return false;
  }

  static requiresAdditionalVerification(settlement: any, sellerAccount: any): boolean {
    // Very large settlements require additional verification
    if (settlement.netAmount > 10000000) { // ₹1,00,000
      return true;
    }

    // Settlements to new bank accounts require verification
    if (sellerAccount.bankAccountAge < 30) { // Bank account added less than 30 days ago
      return true;
    }

    // Unusual settlement patterns require verification
    if (settlement.transactionCount < 5 && settlement.netAmount > 1000000) { // Few transactions but high amount
      return true;
    }

    return false;
  }

  static isWithinRiskLimits(settlement: any, sellerAccount: any): boolean {
    // Check daily settlement limits
    const dailyLimit = this.getDailySettlementLimit(sellerAccount.tier);
    if (settlement.netAmount > dailyLimit) {
      return false;
    }

    // Check monthly settlement limits
    const monthlyLimit = this.getMonthlySettlementLimit(sellerAccount.tier);
    // This would require checking total settlements for the month
    // Implementation would depend on repository access

    // Check velocity limits (settlements per day)
    const maxSettlementsPerDay = this.getMaxSettlementsPerDay(sellerAccount.tier);
    // This would require checking settlements for today
    // Implementation would depend on repository access

    return true;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static getDailySettlementLimit(tier: string): number {
    const limits: Record<string, number> = {
      'STANDARD': 5000000,     // ₹50,000
      'PREMIUM': 20000000,     // ₹2,00,000
      'ENTERPRISE': 50000000,  // ₹5,00,000
    };

    return limits[tier] || limits['STANDARD'];
  }

  private static getMonthlySettlementLimit(tier: string): number {
    const limits: Record<string, number> = {
      'STANDARD': 100000000,    // ₹10,00,000
      'PREMIUM': 500000000,     // ₹50,00,000
      'ENTERPRISE': 1000000000, // ₹1,00,00,000
    };

    return limits[tier] || limits['STANDARD'];
  }

  private static getMaxSettlementsPerDay(tier: string): number {
    const limits: Record<string, number> = {
      'STANDARD': 1,
      'PREMIUM': 3,
      'ENTERPRISE': 10,
    };

    return limits[tier] || limits['STANDARD'];
  }

  // ============================================================================
  // COMPLIANCE POLICIES
  // ============================================================================

  static requiresComplianceCheck(settlement: any, sellerAccount: any): boolean {
    // Large settlements require compliance check
    if (settlement.netAmount > 20000000) { // ₹2,00,000
      return true;
    }

    // International sellers require compliance check
    if (sellerAccount.businessDetails?.country !== 'IN') {
      return true;
    }

    // High-risk categories require compliance check
    const highRiskCategories = ['FINANCIAL_SERVICES', 'GAMBLING', 'ADULT_CONTENT'];
    if (sellerAccount.businessDetails?.category && 
        highRiskCategories.includes(sellerAccount.businessDetails.category)) {
      return true;
    }

    return false;
  }

  static requiresKycRevalidation(sellerAccount: any): boolean {
    // KYC older than 1 year requires revalidation
    if (sellerAccount.verifiedAt) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (sellerAccount.verifiedAt < oneYearAgo) {
        return true;
      }
    }

    // High-risk sellers require more frequent KYC
    if (sellerAccount.riskProfile === 'HIGH') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (sellerAccount.verifiedAt < sixMonthsAgo) {
        return true;
      }
    }

    return false;
  }
}