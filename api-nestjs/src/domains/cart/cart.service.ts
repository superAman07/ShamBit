import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Cart, CartItem, CartStatus } from './entities/cart.entity';
import type { ICartRepository } from './interfaces/cart.repository.interface';
import { CartValidators } from './cart.validators';
import { CartPolicies } from './cart.policies';
import {
  CartCreatedEvent,
  CartItemAddedEvent,
  CartItemRemovedEvent,
  CartItemQuantityUpdatedEvent,
  CartMergedEvent,
  CartExpiredEvent,
} from './events/cart.events';

export interface AddItemRequest {
  variantId: string;
  quantity: number;
  sellerId?: string; // Will be fetched from variant if not provided
}

export interface UpdateItemRequest {
  quantity: number;
}

export interface CartSummary {
  cart: Cart;
  itemCount: number;
  sellerCount: number;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
  estimatedTotal: Decimal;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @Inject('ICartRepository') private readonly cartRepository: ICartRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    // Validate input
    if (!userId && !sessionId) {
      throw new BadRequestException(
        'Either userId or sessionId must be provided',
      );
    }

    // Try to find existing active cart
    let cart = await this.cartRepository.findActiveCart(userId, sessionId);

    if (!cart) {
      // Create new cart
      cart = await this.createCart(userId, sessionId);
    } else {
      // Refresh cart if needed
      await this.refreshCartIfNeeded(cart);
    }

    return cart;
  }

  /**
   * Get cart by ID with access validation
   */
  async getCart(
    cartId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId, {
      items: true,
      appliedPromotions: true,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Validate access
    CartPolicies.validateCartAccess(cart, userId, sessionId);

    return cart;
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    request: AddItemRequest,
    userId?: string,
    sessionId?: string,
  ): Promise<CartItem> {
    // Validate cart access
    const cart = await this.validateCartAccess(cartId, userId, sessionId);

    // Validate request
    CartValidators.validateAddItemRequest(request);

    // Get variant details (this would call variant service)
    const variant = await this.getVariantDetails(request.variantId);
    const sellerId = request.sellerId || variant.product.sellerId;

    // Validate availability
    await this.validateItemAvailability(request.variantId, request.quantity);

    // Check for existing item
    const existingItem = await this.cartRepository.findCartItem(
      cartId,
      request.variantId,
      sellerId,
    );

    let cartItem: CartItem;

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + request.quantity;
      const updatedItem = await this.updateItemQuantity(
        existingItem.id,
        newQuantity,
        userId,
        sessionId,
      );
      cartItem = updatedItem || existingItem; // Fallback to existing item if update returns null
    } else {
      // Create new cart item
      cartItem = await this.createCartItem(
        cart,
        variant,
        request.quantity,
        sellerId,
      );
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);

    // Emit event
    this.eventEmitter.emit(
      'cart.item_added',
      new CartItemAddedEvent(cartId, cartItem, userId || sessionId),
    );

    this.logger.log(`Added item ${request.variantId} to cart ${cartId}`);

    return cartItem;
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    itemId: string,
    newQuantity: number,
    userId?: string,
    sessionId?: string,
  ): Promise<CartItem | null> {
    // Get item and validate access
    const item = await this.validateItemAccess(itemId, userId, sessionId);
    const oldQuantity = item.quantity;

    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      await this.removeItem(itemId, userId, sessionId);
      return null;
    }

    // Validate new quantity availability
    await this.validateItemAvailability(item.variantId, newQuantity);

    // Update item
    const updatedItem = await this.cartRepository.updateItem(itemId, {
      quantity: newQuantity,
      totalPrice: item.currentUnitPrice.mul(newQuantity),
      lastCheckedAt: new Date(),
    });

    // Recalculate cart totals
    await this.recalculateCartTotals(item.cartId);

    // Emit event
    this.eventEmitter.emit(
      'cart.item_quantity_updated',
      new CartItemQuantityUpdatedEvent(
        item.cartId,
        updatedItem,
        oldQuantity,
        newQuantity,
      ),
    );

    this.logger.log(
      `Updated item ${itemId} quantity from ${oldQuantity} to ${newQuantity}`,
    );

    return updatedItem;
  }

  /**
   * Remove item from cart
   */
  async removeItem(
    itemId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    // Get item and validate access
    const item = await this.validateItemAccess(itemId, userId, sessionId);

    // Remove item
    await this.cartRepository.removeItem(itemId);

    // Recalculate cart totals
    await this.recalculateCartTotals(item.cartId);

    // Emit event
    this.eventEmitter.emit(
      'cart.item_removed',
      new CartItemRemovedEvent(item.cartId, item, userId || sessionId || ''),
    );

    this.logger.log(`Removed item ${itemId} from cart ${item.cartId}`);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(
    cartId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    // Validate cart access
    const cart = await this.validateCartAccess(cartId, userId, sessionId);

    // Remove all items
    for (const item of cart.items) {
      await this.cartRepository.removeItem(item.id);
    }

    // Recalculate totals (should be zero)
    await this.recalculateCartTotals(cartId);

    // Emit event
    this.eventEmitter.emit('cart.cleared', {
      cartId,
      userId: userId || sessionId,
      itemCount: cart.items.length,
    });

    this.logger.log(`Cleared cart ${cartId}`);
  }

  /**
   * Merge guest cart into user cart on authentication
   */
  async mergeGuestCart(guestSessionId: string, userId: string): Promise<Cart> {
    // Find guest and user carts
    const guestCart = await this.cartRepository.findActiveCart(
      undefined,
      guestSessionId,
    );
    const userCart = await this.cartRepository.findActiveCart(userId);

    if (!guestCart) {
      // No guest cart to merge, return user cart or create new one
      return userCart || (await this.createCart(userId));
    }

    if (!userCart) {
      // Convert guest cart to user cart
      return await this.convertGuestCartToUser(guestCart, userId);
    }

    // Merge guest items into user cart
    return await this.mergeCartItems(guestCart, userCart, userId);
  }

  /**
   * Get cart summary with additional information
   */
  async getCartSummary(
    cartId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CartSummary> {
    const cart = await this.getCart(cartId, userId, sessionId);

    // Check for unavailable items and price changes
    const hasUnavailableItems = cart.items.some((item) => !item.isAvailable);
    const hasPriceChanges = cart.items.some((item) => item.hasPriceChanged());

    return {
      cart,
      itemCount: cart.getTotalItemCount(),
      sellerCount: cart.getSellerCount(),
      hasUnavailableItems,
      hasPriceChanges,
      estimatedTotal: cart.totalAmount,
    };
  }

  /**
   * Refresh cart data (prices, availability, promotions)
   */
  async refreshCart(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId, { items: true });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Refresh item prices and availability
    for (const item of cart.items) {
      await this.refreshCartItem(item);
    }

    // Recalculate totals and promotions
    await this.recalculateCartTotals(cartId);

    const refreshedCart = await this.cartRepository.findById(cartId, {
      items: true,
      appliedPromotions: true,
    });

    if (!refreshedCart) {
      throw new NotFoundException('Cart not found after refresh');
    }

    return refreshedCart;
  }

  // Private helper methods

  private async createCart(userId?: string, sessionId?: string): Promise<Cart> {
    const expiresAt = this.calculateCartExpiry(!!userId);

    const cartData: Partial<Cart> = {
      userId,
      sessionId,
      status: CartStatus.ACTIVE,
      subtotal: new Decimal(0),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
      shippingAmount: new Decimal(0),
      totalAmount: new Decimal(0),
      currency: 'INR',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      expiresAt,
      lastActivityAt: new Date(),
      version: 1,
    };

    const cart = await this.cartRepository.create(cartData);

    // Emit event
    this.eventEmitter.emit(
      'cart.created',
      new CartCreatedEvent(cart.id, userId, sessionId),
    );

    this.logger.log(
      `Created cart ${cart.id} for ${userId ? `user ${userId}` : `session ${sessionId}`}`,
    );

    return cart;
  }

  private async createCartItem(
    cart: Cart,
    variant: any,
    quantity: number,
    sellerId: string,
  ): Promise<CartItem> {
    const unitPrice = variant.pricing.sellingPrice;
    const totalPrice = unitPrice.mul(quantity);

    const itemData: Partial<CartItem> = {
      cartId: cart.id,
      variantId: variant.id,
      sellerId,
      quantity,
      unitPrice,
      currentUnitPrice: unitPrice,
      totalPrice,
      discountAmount: new Decimal(0),
      isAvailable: true,
      addedAt: new Date(),
      lastCheckedAt: new Date(),
      variantSnapshot: {
        id: variant.id,
        sku: variant.sku,
        name: variant.product.name,
      },
      pricingSnapshot: {
        sellingPrice: unitPrice,
        mrp: variant.pricing.mrp,
        discount: variant.pricing.discount,
      },
    };

    return await this.cartRepository.addItem(cart.id, itemData);
  }

  private async validateCartAccess(
    cartId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId, { items: true });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    CartPolicies.validateCartAccess(cart, userId, sessionId);
    CartValidators.validateCartExpiry(cart);

    return cart;
  }

  private async validateItemAccess(
    itemId: string,
    userId?: string,
    sessionId?: string,
  ): Promise<CartItem> {
    const item = await this.cartRepository.findCartItem(itemId, '', ''); // This needs to be fixed - we need a findItemById method

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Get cart to validate access
    await this.validateCartAccess(item.cartId, userId, sessionId);

    return item;
  }

  private async refreshCartIfNeeded(cart: Cart): Promise<void> {
    const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const now = new Date();

    if (now.getTime() - cart.lastActivityAt.getTime() > REFRESH_THRESHOLD) {
      await this.refreshCart(cart.id);
    }
  }

  private async refreshCartItem(item: CartItem): Promise<void> {
    // This would call external services to get current pricing and availability
    // For now, we'll simulate the logic

    try {
      // Get current variant pricing
      const currentPricing = await this.getCurrentVariantPricing(
        item.variantId,
      );

      // Check if price changed
      if (!item.currentUnitPrice.equals(currentPricing.sellingPrice)) {
        await this.cartRepository.updateItem(item.id, {
          currentUnitPrice: currentPricing.sellingPrice,
          totalPrice: currentPricing.sellingPrice.mul(item.quantity),
          lastCheckedAt: new Date(),
        });
      }

      // Check availability
      const isAvailable = await this.checkItemAvailability(
        item.variantId,
        item.quantity,
      );

      if (item.isAvailable !== isAvailable) {
        await this.cartRepository.updateItem(item.id, {
          isAvailable,
          availabilityReason: isAvailable ? undefined : 'OUT_OF_STOCK',
          lastCheckedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to refresh cart item ${item.id}: ${error.message}`,
      );
    }
  }

  private async recalculateCartTotals(cartId: string): Promise<void> {
    // This would be implemented to recalculate all cart totals
    // including promotions, taxes, and shipping
    await this.cartRepository.recalculateTotals(cartId);
  }

  private async mergeCartItems(
    sourceCart: Cart,
    targetCart: Cart,
    userId: string,
  ): Promise<Cart> {
    const mergeResults: Array<{
      success: boolean;
      itemId: string;
      error?: string;
    }> = [];

    for (const item of sourceCart.items) {
      try {
        await this.addItem(
          targetCart.id,
          {
            variantId: item.variantId,
            quantity: item.quantity,
            sellerId: item.sellerId,
          },
          userId,
        );

        mergeResults.push({ success: true, itemId: item.id });
      } catch (error) {
        this.logger.warn(
          `Failed to merge cart item ${item.id}: ${error.message}`,
        );
        mergeResults.push({
          success: false,
          itemId: item.id,
          error: error.message,
        });
      }
    }

    // Mark source cart as merged
    await this.cartRepository.updateStatus(sourceCart.id, CartStatus.MERGED);

    // Emit merge event
    this.eventEmitter.emit(
      'cart.merged',
      new CartMergedEvent(sourceCart.id, targetCart.id, userId, mergeResults),
    );

    return (await this.cartRepository.findById(targetCart.id, {
      items: true,
      appliedPromotions: true,
    })) as Cart;
  }

  private async convertGuestCartToUser(
    guestCart: Cart,
    userId: string,
  ): Promise<Cart> {
    const updatedCart = await this.cartRepository.update(guestCart.id, {
      userId,
      sessionId: undefined,
      expiresAt: this.calculateCartExpiry(true), // Extend expiry for user cart
      lastActivityAt: new Date(),
    });

    this.logger.log(
      `Converted guest cart ${guestCart.id} to user cart for ${userId}`,
    );

    return updatedCart;
  }

  private calculateCartExpiry(isUserCart: boolean): Date {
    const now = new Date();
    const expiryHours = isUserCart ? 24 * 30 : 24; // 30 days for users, 24 hours for guests
    return new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
  }

  // These methods would integrate with other services
  private async getVariantDetails(variantId: string): Promise<any> {
    // This would call the variant service or product service
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
        pricing: true,
        inventory: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    return variant;
  }

  private async validateItemAvailability(
    variantId: string,
    quantity: number,
  ): Promise<void> {
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { variantId },
    });

    if (!inventory) {
      throw new BadRequestException('Product variant not found');
    }

    if (inventory.availableQuantity < quantity) {
      throw new BadRequestException(
        `Only ${inventory.availableQuantity} units available, requested ${quantity}`,
      );
    }
  }

  private async getCurrentVariantPricing(variantId: string): Promise<any> {
    const pricing = await this.prisma.variantPricing.findFirst({
      where: {
        variantId,
        validFrom: { lte: new Date() },
        OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
      },
      orderBy: { validFrom: 'desc' },
    });

    if (!pricing) {
      throw new NotFoundException(`Pricing not found for variant ${variantId}`);
    }

    return pricing;
  }

  private async checkItemAvailability(
    variantId: string,
    quantity: number,
  ): Promise<boolean> {
    const inventory = await this.prisma.variantInventory.findUnique({
      where: { variantId },
    });

    return inventory ? inventory.availableQuantity >= quantity : false;
  }
}
