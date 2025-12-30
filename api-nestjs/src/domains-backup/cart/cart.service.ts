import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CartRepository } from './cart.repository';
import { CartItemService } from './cart-item.service';
import { InventoryService } from '../inventory/inventory.service';
import { PromotionService } from '../pricing/promotion.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  appliedPromotions: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
  reservationId?: string;
  addedAt: Date;
}

export interface AddToCartDto {
  variantId: string;
  sellerId: string;
  quantity: number;
}

@Injectable()
export class CartService {
  private readonly CART_EXPIRY_HOURS = 24;
  private readonly SOFT_RESERVATION_MINUTES = 30;

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartItemService: CartItemService,
    private readonly inventoryService: InventoryService,
    private readonly promotionService: PromotionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    this.logger.log('CartService.getOrCreateCart', { userId, sessionId });

    let cart = await this.cartRepository.findByUserOrSession(userId, sessionId);

    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CART_EXPIRY_HOURS);

      cart = await this.cartRepository.create({
        userId,
        sessionId,
        subtotal: 0,
        discountAmount: 0,
        totalAmount: 0,
        appliedPromotions: [],
        expiresAt,
      });
    }

    return cart;
  }
  async addToCart(
    cartId: string,
    addToCartDto: AddToCartDto,
    userId?: string,
  ): Promise<Cart> {
    this.logger.log('CartService.addToCart', { cartId, addToCartDto, userId });

    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Check if item already exists in cart
    const existingItem = await this.cartItemService.findByVariantAndSeller(
      cartId,
      addToCartDto.variantId,
      addToCartDto.sellerId,
    );

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + addToCartDto.quantity;
      await this.cartItemService.updateQuantity(existingItem.id, newQuantity);
    } else {
      // Add new item
      await this.cartItemService.addItem(cartId, addToCartDto);
    }

    // Recalculate cart totals
    const updatedCart = await this.recalculateCart(cartId);

    // Emit cart updated event
    this.eventEmitter.emit('cart.item_added', {
      cartId,
      userId,
      variantId: addToCartDto.variantId,
      quantity: addToCartDto.quantity,
      timestamp: new Date(),
    });

    return updatedCart;
  }

  async removeFromCart(cartId: string, itemId: string, userId?: string): Promise<Cart> {
    this.logger.log('CartService.removeFromCart', { cartId, itemId, userId });

    await this.cartItemService.removeItem(itemId);
    const updatedCart = await this.recalculateCart(cartId);

    this.eventEmitter.emit('cart.item_removed', {
      cartId,
      userId,
      itemId,
      timestamp: new Date(),
    });

    return updatedCart;
  }

  async updateQuantity(
    cartId: string,
    itemId: string,
    quantity: number,
    userId?: string,
  ): Promise<Cart> {
    this.logger.log('CartService.updateQuantity', { cartId, itemId, quantity, userId });

    if (quantity <= 0) {
      return this.removeFromCart(cartId, itemId, userId);
    }

    await this.cartItemService.updateQuantity(itemId, quantity);
    const updatedCart = await this.recalculateCart(cartId);

    this.eventEmitter.emit('cart.quantity_updated', {
      cartId,
      userId,
      itemId,
      quantity,
      timestamp: new Date(),
    });

    return updatedCart;
  }

  async applyPromotion(cartId: string, promotionCode: string, userId?: string): Promise<Cart> {
    this.logger.log('CartService.applyPromotion', { cartId, promotionCode, userId });

    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Check promotion eligibility
    const eligibilityCheck = {
      userId: userId || 'guest',
      items: cart.items.map(item => ({
        variantId: item.variantId,
        productId: '', // Would be fetched from variant
        categoryId: '', // Would be fetched from product
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totalAmount: cart.subtotal,
      promotionCode,
    };

    const promotions = await this.promotionService.getEligiblePromotions(eligibilityCheck);
    
    if (promotions.length === 0) {
      throw new BadRequestException('Promotion code is not valid or applicable');
    }

    // Apply promotion
    const appliedPromotions = [...cart.appliedPromotions, promotionCode];
    await this.cartRepository.update(cartId, { appliedPromotions });

    return this.recalculateCart(cartId);
  }

  async mergeCarts(userCartId: string, guestCartId: string): Promise<Cart> {
    this.logger.log('CartService.mergeCarts', { userCartId, guestCartId });

    const [userCart, guestCart] = await Promise.all([
      this.cartRepository.findById(userCartId),
      this.cartRepository.findById(guestCartId),
    ]);

    if (!userCart || !guestCart) {
      throw new NotFoundException('Cart not found');
    }

    // Merge items from guest cart to user cart
    for (const guestItem of guestCart.items) {
      const existingItem = await this.cartItemService.findByVariantAndSeller(
        userCartId,
        guestItem.variantId,
        guestItem.sellerId,
      );

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + guestItem.quantity;
        await this.cartItemService.updateQuantity(existingItem.id, newQuantity);
      } else {
        // Move item to user cart
        await this.cartItemService.moveItem(guestItem.id, userCartId);
      }
    }

    // Delete guest cart
    await this.cartRepository.delete(guestCartId);

    // Recalculate merged cart
    return this.recalculateCart(userCartId);
  }

  async clearCart(cartId: string, userId?: string): Promise<void> {
    this.logger.log('CartService.clearCart', { cartId, userId });

    await this.cartItemService.clearCartItems(cartId);
    await this.cartRepository.update(cartId, {
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
      appliedPromotions: [],
    });

    this.eventEmitter.emit('cart.cleared', {
      cartId,
      userId,
      timestamp: new Date(),
    });
  }

  private async recalculateCart(cartId: string): Promise<Cart> {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Apply promotions if any
    let discountAmount = 0;
    if (cart.appliedPromotions.length > 0) {
      const eligibilityCheck = {
        userId: cart.userId || 'guest',
        items: cart.items.map(item => ({
          variantId: item.variantId,
          productId: '', // Would be fetched
          categoryId: '', // Would be fetched
          sellerId: item.sellerId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        totalAmount: subtotal,
      };

      const applications = await this.promotionService.applyPromotions(eligibilityCheck);
      discountAmount = applications.reduce((sum, app) => sum + app.discountAmount, 0);
    }

    const totalAmount = subtotal - discountAmount;

    // Update cart totals
    return this.cartRepository.update(cartId, {
      subtotal,
      discountAmount,
      totalAmount,
    });
  }
}