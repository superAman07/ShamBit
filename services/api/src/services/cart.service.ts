import { getDatabase } from '@shambit/database';
import { AppError, createLogger, NotFoundError, BadRequestError } from '@shambit/shared';
import {
  CartItem,
  CartItemWithProduct,
  CartSummary,
  AddToCartRequest,
  UpdateCartItemRequest,
  ApplyPromoRequest,
} from '../types/cart.types';
import { promotionService } from './promotion.service';
import { settingsService } from './settings.service';

const logger = createLogger('cart-service');

export class CartService {
  private get db() {
    return getDatabase();
  }

  /**
   * Map database row to CartItem object
   */
  private mapToCartItem(row: any): CartItem {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      quantity: row.quantity,
      addedPrice: row.added_price,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to CartItemWithProduct object
   */
  private mapToCartItemWithProduct(row: any): CartItemWithProduct {
    return {
      id: row.id,
      userId: row.user_id,
      productId: row.product_id,
      quantity: row.quantity,
      addedPrice: row.added_price,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      product: {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description || '',
        price: row.product_price, // Already in paise from database
        imageUrls: row.product_image_urls || [],
        isActive: row.product_is_active,
        stock: row.product_stock,
      },
    };
  }

  /**
   * Validate product exists, is active, and has sufficient stock
   */
  private async validateProduct(productId: string, quantity: number): Promise<any> {
    // Get product with inventory
    const product = await this.db('products')
      .leftJoin('inventory', 'products.id', 'inventory.product_id')
      .where('products.id', productId)
      .select(
        'products.id',
        'products.name',
        'products.description',
        'products.selling_price',
        'products.image_urls',
        'products.is_active',
        'products.is_sellable',
        'inventory.available_stock'
      )
      .first();

    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (!product.is_active) {
      throw new BadRequestError('Product is not active', 'PRODUCT_NOT_ACTIVE');
    }

    if (!product.is_sellable) {
      throw new BadRequestError('Product is not available for sale', 'PRODUCT_NOT_SELLABLE');
    }

    // Check stock availability
    const availableStock = product.available_stock || 0;
    if (availableStock < quantity) {
      throw new BadRequestError(
        `Insufficient stock for product ${product.name}. Available: ${availableStock}`,
        'INSUFFICIENT_STOCK'
      );
    }

    return product;
  }

  /**
   * Add item to cart (or update quantity if exists)
   */
  async addToCart(userId: string, data: AddToCartRequest): Promise<CartItemWithProduct> {
    try {
      // Validate product and stock
      const product = await this.validateProduct(data.productId, data.quantity);

      // Check if product already in cart
      const existingItem = await this.db('cart_items')
        .where({
          user_id: userId,
          product_id: data.productId,
        })
        .first();

      let cartItem;

      if (existingItem) {
        // Update existing item - add to quantity
        const newQuantity = existingItem.quantity + data.quantity;

        // Validate new quantity against stock
        await this.validateProduct(data.productId, newQuantity);

        [cartItem] = await this.db('cart_items')
          .where('id', existingItem.id)
          .update({
            quantity: newQuantity,
            updated_at: this.db.fn.now(),
          })
          .returning('*');

        logger.info('Cart item quantity updated', {
          userId,
          productId: data.productId,
          previousQuantity: existingItem.quantity,
          newQuantity,
        });
      } else {
        // Create new cart item
        // Convert selling_price from decimal string to paise (integer)
        const priceInPaise = Math.round(parseFloat(product.selling_price) * 100);
        
        [cartItem] = await this.db('cart_items')
          .insert({
            user_id: userId,
            product_id: data.productId,
            quantity: data.quantity,
            added_price: priceInPaise,
          })
          .returning('*');

        logger.info('Item added to cart', {
          userId,
          productId: data.productId,
          quantity: data.quantity,
        });
      }

      // Return cart item with product details
      const itemWithProduct = await this.db('cart_items')
        .join('products', 'cart_items.product_id', 'products.id')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .where('cart_items.id', cartItem.id)
        .select(
          'cart_items.*',
          'products.name as product_name',
          'products.description as product_description',
          'products.price as product_price',
          'products.image_urls as product_image_urls',
          'products.is_active as product_is_active',
          'inventory.available_stock as product_stock'
        )
        .first();

      return this.mapToCartItemWithProduct(itemWithProduct);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error adding to cart', { error, userId, data });
      throw new AppError('Failed to add item to cart', 500, 'ADD_TO_CART_ERROR');
    }
  }

  /**
   * Calculate promo discount based on type
   */
  private calculatePromoDiscount(
    subtotal: number,
    discountType: string,
    discountValue: number,
    maxDiscount?: number
  ): number {
    let discountAmount = 0;

    if (discountType === 'percentage') {
      discountAmount = Math.round((subtotal * discountValue) / 100);
      
      // Apply max discount cap if specified
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      // Fixed discount
      discountAmount = discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return discountAmount;
  }

  /**
   * Calculate cart totals
   */
  private async calculateTotals(
    items: CartItemWithProduct[],
    userId: string
  ): Promise<{
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    deliveryFee: number;
    totalAmount: number;
    promoCode?: string;
  }> {
    // Calculate subtotal using current prices
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Get applied promo code if exists
    const appliedPromo = await this.db('cart_promo_codes')
      .where('user_id', userId)
      .first();

    let discountAmount = 0;
    let promoCode: string | undefined;

    if (appliedPromo) {
      discountAmount = this.calculatePromoDiscount(
        subtotal,
        appliedPromo.discount_type,
        appliedPromo.discount_value,
        appliedPromo.max_discount_amount
      );
      promoCode = appliedPromo.promo_code;
    }

    // Get tax rate from settings
    const taxRate = await settingsService.getTaxRate();

    // Calculate tax on subtotal after discount
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * (taxRate / 100));

    // Get delivery fee (considers free delivery threshold based on subtotal)
    const deliveryFee = await settingsService.getDeliveryFee(subtotal);

    // Calculate total
    const totalAmount = subtotal - discountAmount + taxAmount + deliveryFee;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      deliveryFee,
      totalAmount,
      promoCode,
    };
  }

  /**
   * Get user's cart with calculations
   */
  async getCart(userId: string): Promise<CartSummary> {
    try {
      // Get all cart items with product details
      const cartItems = await this.db('cart_items')
        .join('products', 'cart_items.product_id', 'products.id')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .where('cart_items.user_id', userId)
        .select(
          'cart_items.*',
          'products.name as product_name',
          'products.description as product_description',
          'products.price as product_price',
          'products.image_urls as product_image_urls',
          'products.is_active as product_is_active',
          'products.is_sellable as product_is_sellable',
          'inventory.available_stock as product_stock'
        )
        .orderBy('cart_items.created_at', 'desc');

      const warnings: string[] = [];
      const validItems: CartItemWithProduct[] = [];
      const invalidItemIds: string[] = [];

      // Filter out invalid items (deleted/disabled products)
      for (const item of cartItems) {
        if (!item.product_is_active || !item.product_is_sellable) {
          invalidItemIds.push(item.id);
          warnings.push(`${item.product_name} is no longer available and was removed from your cart`);
        } else {
          validItems.push(this.mapToCartItemWithProduct(item));
        }
      }

      // Remove invalid items from database
      if (invalidItemIds.length > 0) {
        await this.db('cart_items')
          .whereIn('id', invalidItemIds)
          .delete();

        logger.info('Removed invalid items from cart', {
          userId,
          removedCount: invalidItemIds.length,
        });
      }

      // Calculate totals
      const totals = await this.calculateTotals(validItems, userId);

      // Count total items
      const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);

      const cartSummary: CartSummary = {
        items: validItems,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        deliveryFee: totals.deliveryFee,
        totalAmount: totals.totalAmount,
        promoCode: totals.promoCode,
        itemCount,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      return cartSummary;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting cart', { error, userId });
      throw new AppError('Failed to get cart', 500, 'GET_CART_ERROR');
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    userId: string,
    cartItemId: string,
    data: UpdateCartItemRequest
  ): Promise<CartItemWithProduct> {
    try {
      // Get cart item
      const cartItem = await this.db('cart_items')
        .where({
          id: cartItemId,
          user_id: userId,
        })
        .first();

      if (!cartItem) {
        throw new NotFoundError('Cart item not found', 'CART_ITEM_NOT_FOUND');
      }

      // Handle quantity = 0 as removal
      if (data.quantity === 0) {
        await this.db('cart_items')
          .where('id', cartItemId)
          .delete();

        logger.info('Cart item removed (quantity set to 0)', {
          userId,
          cartItemId,
          productId: cartItem.product_id,
        });

        // Return a placeholder - caller should handle this case
        throw new BadRequestError('Item removed from cart', 'ITEM_REMOVED');
      }

      // Validate stock for new quantity
      await this.validateProduct(cartItem.product_id, data.quantity);

      // Update quantity
      await this.db('cart_items')
        .where('id', cartItemId)
        .update({
          quantity: data.quantity,
          updated_at: this.db.fn.now(),
        });

      logger.info('Cart item quantity updated', {
        userId,
        cartItemId,
        productId: cartItem.product_id,
        previousQuantity: cartItem.quantity,
        newQuantity: data.quantity,
      });

      // Return updated item with product details
      const updatedItem = await this.db('cart_items')
        .join('products', 'cart_items.product_id', 'products.id')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .where('cart_items.id', cartItemId)
        .select(
          'cart_items.*',
          'products.name as product_name',
          'products.description as product_description',
          'products.price as product_price',
          'products.image_urls as product_image_urls',
          'products.is_active as product_is_active',
          'inventory.available_stock as product_stock'
        )
        .first();

      return this.mapToCartItemWithProduct(updatedItem);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating cart item', { error, userId, cartItemId });
      throw new AppError('Failed to update cart item', 500, 'UPDATE_CART_ITEM_ERROR');
    }
  }

  /**
   * Remove single item from cart
   */
  async removeCartItem(userId: string, cartItemId: string): Promise<CartSummary> {
    try {
      // Verify cart item belongs to user
      const cartItem = await this.db('cart_items')
        .where({
          id: cartItemId,
          user_id: userId,
        })
        .first();

      if (!cartItem) {
        throw new NotFoundError('Cart item not found', 'CART_ITEM_NOT_FOUND');
      }

      // Delete cart item
      await this.db('cart_items')
        .where('id', cartItemId)
        .delete();

      logger.info('Cart item removed', {
        userId,
        cartItemId,
        productId: cartItem.product_id,
      });

      // Return updated cart
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing cart item', { error, userId, cartItemId });
      throw new AppError('Failed to remove cart item', 500, 'REMOVE_CART_ITEM_ERROR');
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<CartSummary> {
    try {
      // Delete all cart items for user
      const deletedCount = await this.db('cart_items')
        .where('user_id', userId)
        .delete();

      logger.info('Cart cleared', {
        userId,
        itemsRemoved: deletedCount,
      });

      // Return empty cart
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error clearing cart', { error, userId });
      throw new AppError('Failed to clear cart', 500, 'CLEAR_CART_ERROR');
    }
  }

  /**
   * Apply promo code to cart
   */
  async applyPromoCode(userId: string, data: ApplyPromoRequest): Promise<CartSummary> {
    try {
      // Get current cart to calculate subtotal
      const cart = await this.getCart(userId);

      if (cart.items.length === 0) {
        throw new BadRequestError('Cannot apply promo code to empty cart', 'EMPTY_CART');
      }

      // Validate promo code
      const validation = await promotionService.validatePromotion({
        code: data.promoCode,
        userId,
        orderAmount: cart.subtotal,
      });

      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || 'Invalid promo code',
          validation.errorCode || 'INVALID_PROMO_CODE'
        );
      }

      const promotion = validation.promotion!;
      const discountAmount = validation.discountAmount!;

      // Store promo code details (replace if exists)
      await this.db('cart_promo_codes')
        .insert({
          user_id: userId,
          promo_code: promotion.code,
          promotion_id: promotion.id,
          discount_type: promotion.discountType,
          discount_value: promotion.discountValue,
          discount_amount: discountAmount,
          max_discount_amount: promotion.maxDiscountAmount,
        })
        .onConflict('user_id')
        .merge();

      logger.info('Promo code applied to cart', {
        userId,
        promoCode: promotion.code,
        discountAmount,
      });

      // Return updated cart with promo applied
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error applying promo code', { error, userId, data });
      throw new AppError('Failed to apply promo code', 500, 'APPLY_PROMO_ERROR');
    }
  }

  /**
   * Remove promo code from cart
   */
  async removePromoCode(userId: string): Promise<void> {
    try {
      const deletedCount = await this.db('cart_promo_codes')
        .where('user_id', userId)
        .delete();

      if (deletedCount > 0) {
        logger.info('Promo code removed from cart', { userId });
      }
    } catch (error) {
      logger.error('Error removing promo code', { error, userId });
      throw new AppError('Failed to remove promo code', 500, 'REMOVE_PROMO_ERROR');
    }
  }
}

export const cartService = new CartService();
