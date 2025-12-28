export class OrderPolicies {
  /**
   * Check if user can create an order
   */
  static canCreateOrder(userId: string, userRole: string): boolean {
    // Basic policy: any authenticated user can create orders
    return !!userId;
  }

  /**
   * Check if user can view an order
   */
  static canViewOrder(userId: string, userRole: string, order: any): boolean {
    // Users can view their own orders
    if (order.customerId === userId) {
      return true;
    }

    // Admins and merchants can view any order
    if (['ADMIN', 'MERCHANT', 'SELLER'].includes(userRole)) {
      return true;
    }

    // Sellers can view orders containing their products
    if (userRole === 'SELLER' && order.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can update an order
   */
  static canUpdateOrder(userId: string, userRole: string, order: any): boolean {
    // Only admins and merchants can update orders
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Sellers can update orders containing their products (limited updates)
    if (userRole === 'SELLER' && order.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can cancel an order
   */
  static canCancelOrder(userId: string, userRole: string, order: any): boolean {
    // Customers can cancel their own orders if not yet shipped
    if (order.customerId === userId && ['PENDING', 'CONFIRMED'].includes(order.status)) {
      return true;
    }

    // Admins and merchants can cancel any order
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Sellers can cancel orders containing their products
    if (userRole === 'SELLER' && order.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can refund an order
   */
  static canRefundOrder(userId: string, userRole: string, order: any): boolean {
    // Only admins, merchants, and sellers can initiate refunds
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Sellers can refund orders containing their products
    if (userRole === 'SELLER' && order.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }

  /**
   * Check if order can be modified based on its current status
   */
  static canModifyOrder(orderStatus: string): boolean {
    const modifiableStatuses = ['PENDING', 'CONFIRMED'];
    return modifiableStatuses.includes(orderStatus);
  }

  /**
   * Check if order can be cancelled based on its current status
   */
  static canCancelOrderByStatus(orderStatus: string): boolean {
    const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING'];
    return cancellableStatuses.includes(orderStatus);
  }

  /**
   * Check if order can be refunded based on its current status
   */
  static canRefundOrderByStatus(orderStatus: string): boolean {
    const refundableStatuses = ['DELIVERED', 'SHIPPED', 'CONFIRMED'];
    return refundableStatuses.includes(orderStatus);
  }

  /**
   * Get maximum refund window in days
   */
  static getRefundWindowDays(orderType?: string): number {
    // Default refund window is 30 days
    // Can be customized based on order type, product category, etc.
    return 30;
  }

  /**
   * Check if order is within refund window
   */
  static isWithinRefundWindow(orderDate: Date, orderType?: string): boolean {
    const windowDays = this.getRefundWindowDays(orderType);
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    return (now.getTime() - orderDate.getTime()) <= windowMs;
  }

  /**
   * Get minimum order amount for free shipping
   */
  static getFreeShippingThreshold(): number {
    return 50; // $50 minimum for free shipping
  }

  /**
   * Check if order qualifies for free shipping
   */
  static qualifiesForFreeShipping(orderAmount: number): boolean {
    return orderAmount >= this.getFreeShippingThreshold();
  }

  /**
   * Get maximum items per order
   */
  static getMaxItemsPerOrder(): number {
    return 100;
  }

  /**
   * Check if order exceeds maximum items limit
   */
  static exceedsMaxItems(itemCount: number): boolean {
    return itemCount > this.getMaxItemsPerOrder();
  }

  /**
   * Check if user can access order data
   */
  static canAccess(userId: string, userRole: string, resource: any): boolean {
    // Basic access control
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      return true;
    }

    // Users can access their own order data
    if (resource.customerId === userId || resource.userId === userId) {
      return true;
    }

    // Sellers can access orders containing their products
    if (userRole === 'SELLER' && resource.items?.some((item: any) => item.sellerId === userId)) {
      return true;
    }

    return false;
  }
}