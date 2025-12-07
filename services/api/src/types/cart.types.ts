import { z } from 'zod';

/**
 * Cart Item - Database model
 */
export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  addedPrice: number; // Price when added to cart (in paise)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cart Item with Product Details
 */
export interface CartItemWithProduct extends CartItem {
  product: {
    id: string;
    name: string;
    description: string;
    price: number; // Current price (in paise)
    imageUrls: string[];
    isActive: boolean;
    stock: number;
  };
}

/**
 * Cart Summary with Calculations
 */
export interface CartSummary {
  items: CartItemWithProduct[];
  subtotal: number; // In paise
  discountAmount: number; // In paise
  taxAmount: number; // In paise
  deliveryFee: number; // In paise
  totalAmount: number; // In paise
  promoCode?: string;
  itemCount: number;
  warnings?: string[]; // Warnings about removed/unavailable items
}

/**
 * Add to Cart Request
 */
export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

/**
 * Update Cart Item Request
 */
export interface UpdateCartItemRequest {
  quantity: number;
}

/**
 * Apply Promo Code Request
 */
export interface ApplyPromoRequest {
  promoCode: string;
}

/**
 * Zod Validation Schemas
 */

// Add to Cart validation schema
export const addToCartSchema = z.object({
  productId: z.string().uuid({ message: 'Product ID must be a valid UUID' }),
  quantity: z.number()
    .int({ message: 'Quantity must be an integer' })
    .positive({ message: 'Quantity must be greater than 0' })
    .max(999, { message: 'Quantity cannot exceed 999' }),
});

// Update Cart Item validation schema
export const updateCartItemSchema = z.object({
  quantity: z.number()
    .int({ message: 'Quantity must be an integer' })
    .min(0, { message: 'Quantity must be 0 or greater' })
    .max(999, { message: 'Quantity cannot exceed 999' }),
});

// Apply Promo Code validation schema
export const applyPromoSchema = z.object({
  promoCode: z.string()
    .min(1, { message: 'Promo code cannot be empty' })
    .max(50, { message: 'Promo code cannot exceed 50 characters' })
    .trim()
    .toUpperCase(),
});

// Cart Item ID param validation schema
export const cartItemIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Cart item ID must be a valid UUID' }),
});

/**
 * Type exports for Zod inferred types
 */
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyPromoInput = z.infer<typeof applyPromoSchema>;
export type CartItemIdParam = z.infer<typeof cartItemIdParamSchema>;
