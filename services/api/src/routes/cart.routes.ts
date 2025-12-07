import { Router, Request, Response, NextFunction } from 'express';
import { cartService } from '../services/cart.service';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import {
  addToCartSchema,
  updateCartItemSchema,
  applyPromoSchema,
  cartItemIdParamSchema,
  AddToCartInput,
  UpdateCartItemInput,
  ApplyPromoInput,
} from '../types/cart.types';
import { ZodError } from 'zod';
import { logger } from '../config/logger.config';

const router = Router();

/**
 * Validation middleware factory
 * Validates request body or params against a Zod schema
 */
const validate = (schema: any, source: 'body' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : req.params;
      const validated = schema.parse(data);
      
      if (source === 'body') {
        req.body = validated;
      } else {
        req.params = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodError = error as ZodError<any>;
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: zodError.issues[0].message,
            details: zodError.issues,
          },
        });
      } else {
        next(error);
      }
    }
  };
};

/**
 * Convert cart item values from paise to rupees for API response
 */
const convertCartItemToResponse = (item: any) => {
  return {
    ...item,
    addedPrice: item.addedPrice / 100,
    product: {
      ...item.product,
      price: item.product.price / 100,
    },
  };
};

/**
 * Add item to cart
 * POST /api/v1/cart/items
 */
router.post(
  '/items',
  authenticate,
  validate(addToCartSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { productId, quantity } = req.body as AddToCartInput;

      const cartItem = await cartService.addToCart(userId, { productId, quantity });

      res.status(201).json({
        success: true,
        data: convertCartItemToResponse(cartItem),
        message: 'Item added to cart',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code || error.message,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to add item to cart',
          },
        });
      }
    }
  }
);

/**
 * Convert cart values from paise to rupees for API response
 */
const convertCartToResponse = (cart: any) => {
  return {
    ...cart,
    items: cart.items.map((item: any) => ({
      ...item,
      addedPrice: item.addedPrice / 100,
      product: {
        ...item.product,
        price: item.product.price / 100,
      },
    })),
    subtotal: cart.subtotal / 100,
    discountAmount: cart.discountAmount / 100,
    taxAmount: cart.taxAmount / 100,
    deliveryFee: cart.deliveryFee / 100,
    totalAmount: cart.totalAmount / 100,
  };
};

/**
 * Get user's cart with calculations
 * GET /api/v1/cart
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const cart = await cartService.getCart(userId);

    res.json({
      success: true,
      data: convertCartToResponse(cart),
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cart',
        },
      });
    }
  }
});

/**
 * Update cart item quantity
 * PUT /api/v1/cart/items/:id
 */
router.put(
  '/items/:id',
  authenticate,
  validate(cartItemIdParamSchema, 'params'),
  validate(updateCartItemSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id: cartItemId } = req.params;
      const { quantity } = req.body as UpdateCartItemInput;

      const cartItem = await cartService.updateCartItem(userId, cartItemId, { quantity });

      res.json({
        success: true,
        data: convertCartItemToResponse(cartItem),
        message: 'Cart item updated',
      });
    } catch (error) {
      if (error instanceof AppError) {
        logger.error('Cart update error', { 
          error: error.message, 
          code: error.code, 
          statusCode: error.statusCode,
          userId: req.user?.id,
          cartItemId: req.params.id,
          quantity: req.body.quantity
        });
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code || error.message,
            message: error.message,
          },
        });
      } else {
        logger.error('Cart update unexpected error', { 
          error, 
          userId: req.user?.id,
          cartItemId: req.params.id 
        });
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update cart item',
          },
        });
      }
    }
  }
);

/**
 * Remove single item from cart
 * DELETE /api/v1/cart/items/:id
 */
router.delete(
  '/items/:id',
  authenticate,
  validate(cartItemIdParamSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id: cartItemId } = req.params;

      const cart = await cartService.removeCartItem(userId, cartItemId);

      res.json({
        success: true,
        data: convertCartToResponse(cart),
        message: 'Item removed from cart',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code || error.message,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to remove cart item',
          },
        });
      }
    }
  }
);

/**
 * Clear entire cart
 * DELETE /api/v1/cart
 */
router.delete('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const cart = await cartService.clearCart(userId);

    res.json({
      success: true,
      data: convertCartToResponse(cart),
      message: 'Cart cleared',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear cart',
        },
      });
    }
  }
});

/**
 * Apply promo code to cart
 * POST /api/v1/cart/apply-promo
 */
router.post(
  '/apply-promo',
  authenticate,
  validate(applyPromoSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { promoCode } = req.body as ApplyPromoInput;

      const cart = await cartService.applyPromoCode(userId, { promoCode });

      res.json({
        success: true,
        data: convertCartToResponse(cart),
        message: 'Promo code applied successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code || error.message,
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to apply promo code',
          },
        });
      }
    }
  }
);

/**
 * Remove promo code from cart
 * DELETE /api/v1/cart/promo
 */
router.delete('/promo', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await cartService.removePromoCode(userId);

    // Get updated cart after removing promo
    const cart = await cartService.getCart(userId);

    res.json({
      success: true,
      data: convertCartToResponse(cart),
      message: 'Promo code removed',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove promo code',
        },
      });
    }
  }
});

export default router;
