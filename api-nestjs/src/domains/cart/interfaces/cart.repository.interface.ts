import { Cart, CartItem, AppliedPromotion } from '../entities/cart.entity';

export interface CartFilters {
  userId?: string;
  sessionId?: string;
  status?: string;
  sellerId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export interface CartIncludeOptions {
  items?: boolean;
  appliedPromotions?: boolean;
  user?: boolean;
  reservations?: boolean;
  auditLogs?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CartStatistics {
  totalCarts: number;
  activeCarts: number;
  expiredCarts: number;
  convertedCarts: number;
  averageItemsPerCart: number;
  averageCartValue: number;
  topSellersByCartItems: Array<{
    sellerId: string;
    itemCount: number;
  }>;
}

export interface ICartRepository {
  // Cart CRUD operations
  findById(id: string, includes?: CartIncludeOptions): Promise<Cart | null>;
  findByIds(ids: string[], includes?: CartIncludeOptions): Promise<Cart[]>;
  findAll(
    filters: CartFilters,
    pagination: PaginationOptions,
    includes?: CartIncludeOptions,
  ): Promise<{ data: Cart[]; total: number }>;

  // User/session specific operations
  findActiveCart(userId?: string, sessionId?: string): Promise<Cart | null>;
  findActiveByIdentifier(identifier: string): Promise<Cart[]>;
  findUserCarts(
    userId: string,
    pagination?: PaginationOptions,
  ): Promise<Cart[]>;

  // Cart lifecycle operations
  create(cartData: Partial<Cart>): Promise<Cart>;
  update(id: string, updates: Partial<Cart>): Promise<Cart>;
  updateStatus(id: string, status: string, reason?: string): Promise<Cart>;
  delete(id: string): Promise<void>;
  softDelete(id: string, deletedBy: string, reason?: string): Promise<void>;

  // Bulk operations
  bulkUpdateStatus(ids: string[], status: string): Promise<Cart[]>;
  bulkDelete(ids: string[]): Promise<void>;

  // Cart item operations
  addItem(cartId: string, itemData: Partial<CartItem>): Promise<CartItem>;
  updateItem(itemId: string, updates: Partial<CartItem>): Promise<CartItem>;
  removeItem(itemId: string): Promise<void>;
  findCartItem(
    cartId: string,
    variantId: string,
    sellerId: string,
  ): Promise<CartItem | null>;

  // Promotion operations
  addAppliedPromotion(
    promotionData: Partial<AppliedPromotion>,
  ): Promise<AppliedPromotion>;
  removeAppliedPromotion(id: string): Promise<void>;
  clearAppliedPromotions(cartId: string): Promise<void>;

  // Utility operations
  recalculateTotals(cartId: string): Promise<Cart>;
  cleanupExpiredCarts(): Promise<number>;
  getStatistics(): Promise<CartStatistics>;

  // Advanced queries
  findCartsWithExpiredReservations(): Promise<Cart[]>;
  findAbandonedCarts(daysAgo: number): Promise<Cart[]>;
  findHighValueCarts(minValue: number): Promise<Cart[]>;
}

export interface ICartItemRepository {
  findById(id: string): Promise<CartItem | null>;
  findByCartId(cartId: string): Promise<CartItem[]>;
  findByVariantId(variantId: string): Promise<CartItem[]>;
  findBySellerId(sellerId: string): Promise<CartItem[]>;

  create(itemData: Partial<CartItem>): Promise<CartItem>;
  update(id: string, updates: Partial<CartItem>): Promise<CartItem>;
  delete(id: string): Promise<void>;

  batchUpdate(
    updates: Array<{ id: string; data: Partial<CartItem> }>,
  ): Promise<CartItem[]>;
  batchDelete(ids: string[]): Promise<void>;

  // Availability checks
  checkAvailability(variantId: string, quantity: number): Promise<boolean>;
  getUnavailableItems(cartId: string): Promise<CartItem[]>;
}

export interface IAppliedPromotionRepository {
  findById(id: string): Promise<AppliedPromotion | null>;
  findByCartId(cartId: string): Promise<AppliedPromotion[]>;
  findByPromotionId(promotionId: string): Promise<AppliedPromotion[]>;
  findByOrderId(orderId: string): Promise<AppliedPromotion[]>;

  create(promotionData: Partial<AppliedPromotion>): Promise<AppliedPromotion>;
  update(
    id: string,
    updates: Partial<AppliedPromotion>,
  ): Promise<AppliedPromotion>;
  delete(id: string): Promise<void>;

  // Bulk operations
  createMany(
    promotions: Partial<AppliedPromotion>[],
  ): Promise<AppliedPromotion[]>;
  deleteByCartId(cartId: string): Promise<void>;
  deleteByPromotionId(promotionId: string): Promise<void>;

  // Analytics
  getPromotionUsageStats(promotionId: string): Promise<{
    totalUsage: number;
    totalDiscount: number;
    uniqueUsers: number;
  }>;
}
