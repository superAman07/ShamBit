export class OrderPolicies {
  static canUserViewOrder(userId: string, order: any, userRole: string): boolean {
    // Customers can only view their own orders
    if (userRole === 'CUSTOMER') {
      return order.customerId === userId;
    }
    
    // Sellers can view orders containing their products
    if (userRole === 'SELLER') {
      return order.items?.some((item: any) => item.sellerId === userId);
    }
    
    // Admins can view all orders
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }
    
    return false;
  }

  static canUserModifyOrder(userId: string, order: any, userRole: string): boolean {
    // Only admins can modify orders after creation
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }
    
    // Customers can only modify their own pending orders
    if (userRole === 'CUSTOMER' && order.customerId === userId) {
      return order.status === 'PENDING';
    }
    
    return false;
  }

  static canUserCancelOrder(userId: string, order: any, userRole: string): boolean {
    // Check if order can be cancelled based on status
    const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.status)) {
      return false;
    }
    
    // Customers can cancel their own orders
    if (userRole === 'CUSTOMER' && order.customerId === userId) {
      return true;
    }
    
    // Admins can cancel any order
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }
    
    return false;
  }

  static getMaxOrderValue(userRole: string): number {
    switch (userRole) {
      case 'CUSTOMER':
        return 10000; // $10,000 max per order
      case 'SELLER':
        return 50000; // $50,000 max per order
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return Number.MAX_SAFE_INTEGER; // No limit
      default:
        return 1000; // $1,000 default limit
    }
  }

  static getMaxItemsPerOrder(userRole: string): number {
    switch (userRole) {
      case 'CUSTOMER':
        return 50; // 50 items max per order
      case 'SELLER':
        return 100; // 100 items max per order
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return Number.MAX_SAFE_INTEGER; // No limit
      default:
        return 10; // 10 items default limit
    }
  }

  static canAccess(userId: string, userRole: string, order: any): boolean {
    // Customers can only access their own orders
    if (userRole === 'CUSTOMER') {
      return order.customerId === userId;
    }
    
    // Sellers can access orders containing their products
    if (userRole === 'SELLER') {
      return order.items?.some((item: any) => item.sellerId === userId);
    }
    
    // Admins can access all orders
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return true;
    }
    
    return false;
  }
}