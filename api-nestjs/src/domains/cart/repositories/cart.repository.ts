import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  ICartRepository,
  CartFilters,
  CartIncludeOptions,
  PaginationOptions,
  CartStatistics,
} from '../interfaces/cart.repository.interface';
import {
  Cart,
  CartItem,
  AppliedPromotion,
  CartStatus,
} from '../entities/cart.entity';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CartRepository implements ICartRepository {
  private readonly logger = new Logger(CartRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    includes?: CartIncludeOptions,
  ): Promise<Cart | null> {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { id },
        include: this.buildIncludeClause(includes),
      });

      return cart ? this.transformToEntity(cart) : null;
    } catch (error) {
      this.logger.error(`Failed to find cart by ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async findByIds(
    ids: string[],
    includes?: CartIncludeOptions,
  ): Promise<Cart[]> {
    try {
      const carts = await this.prisma.cart.findMany({
        where: { id: { in: ids } },
        include: this.buildIncludeClause(includes),
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(`Failed to find carts by IDs: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    filters: CartFilters,
    pagination: PaginationOptions,
    includes?: CartIncludeOptions,
  ): Promise<{ data: Cart[]; total: number }> {
    try {
      const where = this.buildWhereClause(filters);
      const orderBy = this.buildOrderByClause(pagination);
      const skip = ((pagination.page || 1) - 1) * (pagination.limit || 20);
      const take = pagination.limit || 20;

      const [carts, total] = await Promise.all([
        this.prisma.cart.findMany({
          where,
          include: this.buildIncludeClause(includes),
          orderBy,
          skip,
          take,
        }),
        this.prisma.cart.count({ where }),
      ]);

      return {
        data: carts.map((cart) => this.transformToEntity(cart)),
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to find carts: ${error.message}`);
      throw error;
    }
  }

  async findActiveCart(
    userId?: string,
    sessionId?: string,
  ): Promise<Cart | null> {
    try {
      const where: any = {
        status: CartStatus.ACTIVE,
        OR: [],
      };

      if (userId) {
        where.OR.push({ userId });
      }
      if (sessionId) {
        where.OR.push({ sessionId });
      }

      if (where.OR.length === 0) {
        return null;
      }

      const cart = await this.prisma.cart.findFirst({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  pricing: true,
                  inventory: true,
                },
              },
              seller: true,
            },
          },
          appliedPromotionDetails: {
            include: {
              promotion: true,
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      return cart ? this.transformToEntity(cart) : null;
    } catch (error) {
      this.logger.error(`Failed to find active cart: ${error.message}`);
      throw error;
    }
  }

  async findActiveByIdentifier(identifier: string): Promise<Cart[]> {
    try {
      const carts = await this.prisma.cart.findMany({
        where: {
          status: CartStatus.ACTIVE,
          OR: [{ userId: identifier }, { sessionId: identifier }],
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(
        `Failed to find active carts by identifier: ${error.message}`,
      );
      throw error;
    }
  }

  async findUserCarts(
    userId: string,
    pagination?: PaginationOptions,
  ): Promise<Cart[]> {
    try {
      const orderBy = pagination
        ? this.buildOrderByClause(pagination)
        : { createdAt: 'desc' };
      const skip = pagination
        ? ((pagination.page || 1) - 1) * (pagination.limit || 20)
        : 0;
      const take = pagination?.limit || 50;

      const carts = await this.prisma.cart.findMany({
        where: { userId },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
        orderBy,
        skip,
        take,
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(`Failed to find user carts: ${error.message}`);
      throw error;
    }
  }

  async create(cartData: Partial<Cart>): Promise<Cart> {
    try {
      const cart = await this.prisma.cart.create({
        data: {
          userId: cartData.userId,
          sessionId: cartData.sessionId,
          status: cartData.status || CartStatus.ACTIVE,
          subtotal: cartData.subtotal || new Decimal(0),
          discountAmount: cartData.discountAmount || new Decimal(0),
          taxAmount: cartData.taxAmount || new Decimal(0),
          shippingAmount: cartData.shippingAmount || new Decimal(0),
          totalAmount: cartData.totalAmount || new Decimal(0),
          appliedPromotions: cartData.appliedPromotions || [],
          availablePromotions: cartData.availablePromotions || [],
          currency: cartData.currency || 'INR',
          locale: cartData.locale || 'en-IN',
          timezone: cartData.timezone || 'Asia/Kolkata',
          expiresAt: cartData.expiresAt,
          lastActivityAt: cartData.lastActivityAt || new Date(),
          version: cartData.version || 1,
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return this.transformToEntity(cart);
    } catch (error) {
      this.logger.error(`Failed to create cart: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updates: Partial<Cart>): Promise<Cart> {
    try {
      // Extract only the fields that can be updated in Prisma
      const {
        userId,
        sessionId,
        status,
        subtotal,
        discountAmount,
        taxAmount,
        shippingAmount,
        totalAmount,
        currency,
        locale,
        timezone,
        expiresAt,
        lastActivityAt,
        convertedToOrderId,
        // Exclude computed fields and relations
        ...otherFields
      } = updates;

      const cart = await this.prisma.cart.update({
        where: { id },
        data: {
          userId,
          sessionId,
          status,
          subtotal,
          discountAmount,
          taxAmount,
          shippingAmount,
          totalAmount,
          currency,
          locale,
          timezone,
          expiresAt,
          lastActivityAt,
          convertedToOrderId,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return this.transformToEntity(cart);
    } catch (error) {
      this.logger.error(`Failed to update cart ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: string,
    reason?: string,
  ): Promise<Cart> {
    try {
      const cart = await this.prisma.cart.update({
        where: { id },
        data: {
          status: status as CartStatus,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      // Log status change
      await this.prisma.cartAuditLog.create({
        data: {
          cartId: id,
          action: 'CONVERTED', // Use a valid enum value
          actorType: 'SYSTEM',
          details: {
            oldStatus: 'UNKNOWN', // Would need to fetch old status
            newStatus: status,
            reason,
          },
        },
      });

      return this.transformToEntity(cart);
    } catch (error) {
      this.logger.error(`Failed to update cart status ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.cart.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete cart ${id}: ${error.message}`);
      throw error;
    }
  }

  async softDelete(
    id: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    try {
      await this.prisma.cart.update({
        where: { id },
        data: {
          status: CartStatus.ABANDONED,
          updatedAt: new Date(),
        },
      });

      // Log soft deletion
      await this.prisma.cartAuditLog.create({
        data: {
          cartId: id,
          action: 'EXPIRED', // Use a valid enum value for deletion
          actorId: deletedBy,
          actorType: 'USER',
          details: { reason },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete cart ${id}: ${error.message}`);
      throw error;
    }
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<Cart[]> {
    try {
      await this.prisma.cart.updateMany({
        where: { id: { in: ids } },
        data: {
          status: status as CartStatus,
          updatedAt: new Date(),
        },
      });

      return await this.findByIds(ids);
    } catch (error) {
      this.logger.error(`Failed to bulk update cart status: ${error.message}`);
      throw error;
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      await this.prisma.cart.deleteMany({
        where: { id: { in: ids } },
      });
    } catch (error) {
      this.logger.error(`Failed to bulk delete carts: ${error.message}`);
      throw error;
    }
  }

  async addItem(
    cartId: string,
    itemData: Partial<CartItem>,
  ): Promise<CartItem> {
    try {
      const cartItem = await this.prisma.cartItem.create({
        data: {
          cartId,
          variantId: itemData.variantId!,
          sellerId: itemData.sellerId!,
          quantity: itemData.quantity!,
          unitPrice: itemData.unitPrice!,
          currentUnitPrice: itemData.currentUnitPrice!,
          totalPrice: itemData.totalPrice!,
          discountAmount: itemData.discountAmount || new Decimal(0),
          isAvailable: itemData.isAvailable ?? true,
          addedAt: itemData.addedAt || new Date(),
          lastCheckedAt: itemData.lastCheckedAt || new Date(),
          variantSnapshot: itemData.variantSnapshot || {},
          pricingSnapshot: itemData.pricingSnapshot || {},
        },
        include: {
          variant: {
            include: {
              product: true,
              pricing: true,
            },
          },
          seller: true,
        },
      });

      return this.transformCartItemToEntity(cartItem);
    } catch (error) {
      this.logger.error(
        `Failed to add item to cart ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateItem(
    itemId: string,
    updates: Partial<CartItem>,
  ): Promise<CartItem> {
    try {
      // Extract only the fields that can be updated in Prisma
      const {
        quantity,
        unitPrice,
        currentUnitPrice,
        totalPrice,
        discountAmount,
        isAvailable,
        availabilityReason,
        reservationId,
        reservationExpiresAt,
        variantSnapshot,
        pricingSnapshot,
        // Exclude computed fields and relations
        ...otherFields
      } = updates;

      const cartItem = await this.prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          unitPrice,
          currentUnitPrice,
          totalPrice,
          discountAmount,
          isAvailable,
          availabilityReason,
          reservationId,
          reservationExpiresAt,
          variantSnapshot,
          pricingSnapshot,
          lastCheckedAt: new Date(),
        },
        include: {
          variant: {
            include: {
              product: true,
              pricing: true,
            },
          },
          seller: true,
        },
      });

      return this.transformCartItemToEntity(cartItem);
    } catch (error) {
      this.logger.error(
        `Failed to update cart item ${itemId}: ${error.message}`,
      );
      throw error;
    }
  }

  async removeItem(itemId: string): Promise<void> {
    try {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove cart item ${itemId}: ${error.message}`,
      );
      throw error;
    }
  }

  async findCartItem(
    cartId: string,
    variantId: string,
    sellerId: string,
  ): Promise<CartItem | null> {
    try {
      const cartItem = await this.prisma.cartItem.findUnique({
        where: {
          cartId_variantId_sellerId: {
            cartId,
            variantId,
            sellerId,
          },
        },
        include: {
          variant: {
            include: {
              product: true,
              pricing: true,
            },
          },
          seller: true,
        },
      });

      return cartItem ? this.transformCartItemToEntity(cartItem) : null;
    } catch (error) {
      this.logger.error(`Failed to find cart item: ${error.message}`);
      throw error;
    }
  }

  async addAppliedPromotion(
    promotionData: Partial<AppliedPromotion>,
  ): Promise<AppliedPromotion> {
    try {
      const appliedPromotion = await this.prisma.appliedPromotion.create({
        data: {
          promotionId: promotionData.promotionId!,
          promotionCode: promotionData.promotionCode!,
          promotionName: promotionData.promotionName!,
          cartId: promotionData.cartId,
          cartItemId: promotionData.cartItemId,
          orderId: promotionData.orderId,
          discountType: promotionData.discountType! as any, // Cast to enum type
          discountValue: promotionData.discountValue!,
          discountAmount: promotionData.discountAmount!,
          maxDiscountAmount: promotionData.maxDiscountAmount,
          priority: promotionData.priority || 0,
          eligibilitySnapshot: promotionData.eligibilitySnapshot || {},
          appliedAt: promotionData.appliedAt || new Date(),
          appliedBy: promotionData.appliedBy,
        },
        include: {
          promotion: true,
        },
      });

      return this.transformAppliedPromotionToEntity(appliedPromotion);
    } catch (error) {
      this.logger.error(`Failed to add applied promotion: ${error.message}`);
      throw error;
    }
  }

  async removeAppliedPromotion(id: string): Promise<void> {
    try {
      await this.prisma.appliedPromotion.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove applied promotion ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  async clearAppliedPromotions(cartId: string): Promise<void> {
    try {
      await this.prisma.appliedPromotion.deleteMany({
        where: { cartId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to clear applied promotions for cart ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  async recalculateTotals(cartId: string): Promise<Cart> {
    try {
      // Get cart with items
      const cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      if (!cart) {
        throw new Error(`Cart ${cartId} not found`);
      }

      // Calculate new totals
      const subtotal = cart.items.reduce(
        (sum, item) => sum.add(new Decimal(item.totalPrice.toString())),
        new Decimal(0),
      );

      const discountAmount = cart.appliedPromotionDetails.reduce(
        (sum, promo) => sum.add(new Decimal(promo.discountAmount.toString())),
        new Decimal(0),
      );

      // Update cart with new totals
      const updatedCart = await this.prisma.cart.update({
        where: { id: cartId },
        data: {
          subtotal,
          discountAmount,
          totalAmount: subtotal
            .sub(discountAmount)
            .add(cart.taxAmount)
            .add(cart.shippingAmount),
          lastActivityAt: new Date(),
          version: { increment: 1 },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return this.transformToEntity(updatedCart);
    } catch (error) {
      this.logger.error(
        `Failed to recalculate totals for cart ${cartId}: ${error.message}`,
      );
      throw error;
    }
  }

  async cleanupExpiredCarts(): Promise<number> {
    try {
      const result = await this.prisma.cart.updateMany({
        where: {
          status: CartStatus.ACTIVE,
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: CartStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired carts: ${error.message}`);
      throw error;
    }
  }

  async getStatistics(): Promise<CartStatistics> {
    try {
      const [
        totalCarts,
        activeCarts,
        expiredCarts,
        convertedCarts,
        avgItemsResult,
        avgValueResult,
        topSellers,
      ] = await Promise.all([
        this.prisma.cart.count(),
        this.prisma.cart.count({ where: { status: CartStatus.ACTIVE } }),
        this.prisma.cart.count({ where: { status: CartStatus.EXPIRED } }),
        this.prisma.cart.count({ where: { status: CartStatus.CONVERTED } }),
        this.prisma.cartItem.aggregate({
          _avg: { quantity: true },
        }),
        this.prisma.cart.aggregate({
          _avg: { totalAmount: true },
        }),
        this.prisma.cartItem.groupBy({
          by: ['sellerId'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalCarts,
        activeCarts,
        expiredCarts,
        convertedCarts,
        averageItemsPerCart: avgItemsResult._avg.quantity || 0,
        averageCartValue: Number(avgValueResult._avg.totalAmount) || 0,
        topSellersByCartItems: topSellers.map((seller) => ({
          sellerId: seller.sellerId,
          itemCount: seller._count.id,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get cart statistics: ${error.message}`);
      throw error;
    }
  }

  async findCartsWithExpiredReservations(): Promise<Cart[]> {
    try {
      const carts = await this.prisma.cart.findMany({
        where: {
          status: CartStatus.ACTIVE,
          items: {
            some: {
              reservationExpiresAt: {
                lt: new Date(),
              },
            },
          },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(
        `Failed to find carts with expired reservations: ${error.message}`,
      );
      throw error;
    }
  }

  async findAbandonedCarts(daysAgo: number): Promise<Cart[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      const carts = await this.prisma.cart.findMany({
        where: {
          status: CartStatus.ACTIVE,
          lastActivityAt: {
            lt: cutoffDate,
          },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(`Failed to find abandoned carts: ${error.message}`);
      throw error;
    }
  }

  async findHighValueCarts(minValue: number): Promise<Cart[]> {
    try {
      const carts = await this.prisma.cart.findMany({
        where: {
          status: CartStatus.ACTIVE,
          totalAmount: {
            gte: new Decimal(minValue),
          },
        },
        include: {
          items: true,
          appliedPromotionDetails: true,
        },
        orderBy: {
          totalAmount: 'desc',
        },
      });

      return carts.map((cart) => this.transformToEntity(cart));
    } catch (error) {
      this.logger.error(`Failed to find high value carts: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private buildWhereClause(filters: CartFilters): any {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.sessionId) {
      where.sessionId = filters.sessionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.sellerId) {
      where.items = {
        some: {
          sellerId: filters.sellerId,
        },
      };
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    if (filters.expiresAfter || filters.expiresBefore) {
      where.expiresAt = {};
      if (filters.expiresAfter) {
        where.expiresAt.gte = filters.expiresAfter;
      }
      if (filters.expiresBefore) {
        where.expiresAt.lte = filters.expiresBefore;
      }
    }

    return where;
  }

  private buildIncludeClause(includes?: CartIncludeOptions): any {
    const include: any = {};

    if (includes?.items) {
      include.items = {
        include: {
          variant: {
            include: {
              product: true,
              pricing: true,
              inventory: true,
            },
          },
          seller: true,
          appliedPromotions: {
            include: {
              promotion: true,
            },
          },
        },
      };
    }

    if (includes?.appliedPromotions) {
      include.appliedPromotionDetails = {
        include: {
          promotion: true,
        },
      };
    }

    if (includes?.user) {
      include.user = true;
    }

    if (includes?.auditLogs) {
      include.auditLogs = {
        orderBy: { occurredAt: 'desc' },
        take: 50,
      };
    }

    return include;
  }

  private buildOrderByClause(pagination: PaginationOptions): any {
    const orderBy: any = {};

    if (pagination.sortBy) {
      orderBy[pagination.sortBy] = pagination.sortOrder || 'desc';
    } else {
      orderBy.lastActivityAt = 'desc';
    }

    return orderBy;
  }

  private transformToEntity(cart: any): Cart {
    return new Cart({
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      status: cart.status,
      subtotal: new Decimal(cart.subtotal.toString()),
      discountAmount: new Decimal(cart.discountAmount.toString()),
      taxAmount: new Decimal(cart.taxAmount.toString()),
      shippingAmount: new Decimal(cart.shippingAmount.toString()),
      totalAmount: new Decimal(cart.totalAmount.toString()),
      appliedPromotions: cart.appliedPromotions,
      availablePromotions: cart.availablePromotions,
      currency: cart.currency,
      locale: cart.locale,
      timezone: cart.timezone,
      expiresAt: cart.expiresAt,
      lastActivityAt: cart.lastActivityAt,
      convertedToOrderId: cart.convertedToOrderId,
      version: cart.version,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items:
        cart.items?.map((item: any) => this.transformCartItemToEntity(item)) ||
        [],
      appliedPromotionDetails:
        cart.appliedPromotionDetails?.map((promo: any) =>
          this.transformAppliedPromotionToEntity(promo),
        ) || [],
    });
  }

  private transformCartItemToEntity(item: any): CartItem {
    return new CartItem({
      id: item.id,
      cartId: item.cartId,
      variantId: item.variantId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: new Decimal(item.unitPrice.toString()),
      currentUnitPrice: new Decimal(item.currentUnitPrice.toString()),
      totalPrice: new Decimal(item.totalPrice.toString()),
      discountAmount: new Decimal(item.discountAmount.toString()),
      isAvailable: item.isAvailable,
      availabilityReason: item.availabilityReason,
      reservationId: item.reservationId,
      reservationExpiresAt: item.reservationExpiresAt,
      addedAt: item.addedAt,
      lastCheckedAt: item.lastCheckedAt,
      variantSnapshot: item.variantSnapshot,
      pricingSnapshot: item.pricingSnapshot,
      appliedPromotions:
        item.appliedPromotions?.map((promo: any) =>
          this.transformAppliedPromotionToEntity(promo),
        ) || [],
    });
  }

  private transformAppliedPromotionToEntity(promo: any): AppliedPromotion {
    return new AppliedPromotion({
      id: promo.id,
      promotionId: promo.promotionId,
      promotionCode: promo.promotionCode,
      promotionName: promo.promotionName,
      cartId: promo.cartId,
      cartItemId: promo.cartItemId,
      orderId: promo.orderId,
      discountType: promo.discountType,
      discountValue: new Decimal(promo.discountValue.toString()),
      discountAmount: new Decimal(promo.discountAmount.toString()),
      maxDiscountAmount: promo.maxDiscountAmount
        ? new Decimal(promo.maxDiscountAmount.toString())
        : undefined,
      priority: promo.priority,
      eligibilitySnapshot: promo.eligibilitySnapshot,
      appliedAt: promo.appliedAt,
      appliedBy: promo.appliedBy,
    });
  }
}
