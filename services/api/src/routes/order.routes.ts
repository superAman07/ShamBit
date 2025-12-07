import { Router, Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { AppError } from '@shambit/shared';
import { CreateOrderRequest, UpdateOrderStatusRequest, CancelOrderRequest, ReturnOrderRequest } from '../types/order.types';
import { z } from 'zod';

const router = Router();

// Helper function to convert address from snake_case to camelCase
const convertAddressToCamelCase = (address: any) => {
  if (!address) return null;
  
  return {
    id: address.id,
    userId: address.user_id,
    type: address.type,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark,
    latitude: address.latitude,
    longitude: address.longitude,
    isDefault: address.is_default,
    createdAt: address.created_at,
    updatedAt: address.updated_at,
  };
};

// Helper function to convert order amounts from paise to rupees
const convertOrderToRupees = (order: any) => {
  return {
    ...order,
    subtotal: order.subtotal / 100,
    taxAmount: order.taxAmount / 100,
    deliveryFee: order.deliveryFee / 100,
    discountAmount: order.discountAmount / 100,
    totalAmount: order.totalAmount / 100,
    deliveryAddress: convertAddressToCamelCase(order.deliveryAddress),
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: item.unitPrice / 100,
      totalPrice: item.totalPrice / 100,
    })),
  };
};

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'canceled', 'returned']),
});

const assignDeliverySchema = z.object({
  deliveryPersonId: z.string().uuid(),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const returnOrderSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const addNoteSchema = z.object({
  note: z.string().min(1).max(500),
});

// New validation schemas for enhanced order management
const putOnHoldSchema = z.object({
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

const recordDeliveryAttemptSchema = z.object({
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  rescheduleTime: z.string().datetime().optional(),
});

const retryDeliverySchema = z.object({
  newDeliveryTime: z.string().datetime().optional(),
  deliveryPersonnelId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

const requestReturnSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const approveReturnSchema = z.object({
  notes: z.string().max(1000).optional(),
  restockItems: z.boolean().optional().default(true),
});

const rejectReturnSchema = z.object({
  reason: z.string().min(1).max(500),
});

const scheduleReturnPickupSchema = z.object({
  pickupTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

const completeReturnSchema = z.object({
  restockItems: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
});

const initiateRefundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
});

const completeRefundSchema = z.object({
  refundReference: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
});

const contactCustomerSchema = z.object({
  method: z.enum(['phone', 'sms', 'whatsapp', 'email']),
  message: z.string().min(1).max(1000),
  responseReceived: z.boolean().optional(),
  followUpRequired: z.boolean().optional(),
});

const updateDeliveryInstructionsSchema = z.object({
  instructions: z.string().min(1).max(500),
});

// Helper function to get admin email from JWT or database
async function getAdminEmail(req: Request): Promise<string> {
  const adminId = req.user!.id;
  
  // Try to get from database
  try {
    const { getDatabase } = await import('@shambit/database');
    const db = getDatabase();
    const admin = await db('admins').where({ id: adminId }).select('email').first();
    
    if (admin && admin.email) {
      return admin.email;
    }
  } catch (error) {
    // Fallback to admin ID if database query fails
  }
  
  // Fallback to admin ID
  return `admin-${adminId}`;
}

/**
 * Create a new order
 * POST /api/v1/orders
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderData: CreateOrderRequest = req.body;

    const result = await orderService.createOrder(userId, orderData);

    // Convert order to match Android app's expected structure
    const orderResponse = {
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        userId: result.order.userId,
        status: result.order.status,
        deliveryAddressId: result.order.deliveryAddressId,
        deliveryAddress: convertAddressToCamelCase(result.order.deliveryAddress),
        subtotal: result.order.subtotal,
        taxAmount: result.order.taxAmount,
        deliveryFee: result.order.deliveryFee,
        discountAmount: result.order.discountAmount,
        totalAmount: result.order.totalAmount,
        paymentMethod: result.order.paymentMethod,
        paymentStatus: result.order.paymentStatus,
        paymentId: result.order.paymentId,
        promoCode: result.order.promoCode,
        deliveryPersonnelId: result.order.deliveryPersonnelId,
        estimatedDeliveryTime: result.order.estimatedDeliveryTime,
        actualDeliveryTime: result.order.actualDeliveryTime,
        items: result.order.items?.map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        })),
        createdAt: result.order.createdAt,
        updatedAt: result.order.updatedAt,
        confirmedAt: result.order.confirmedAt,
        deliveredAt: result.order.deliveredAt,
        canceledAt: result.order.canceledAt,
      },
      paymentDetails: result.paymentDetails,
    };

    res.status(201).json({
      success: true,
      data: orderResponse,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create order',
        },
      });
    }
  }
});

/**
 * Get user's orders
 * GET /api/v1/orders
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await orderService.getUserOrders(userId, page, pageSize);

    // Convert amounts from paise to rupees
    const ordersInRupees = result.orders.map(convertOrderToRupees);

    res.json({
      success: true,
      data: ordersInRupees,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        totalItems: result.total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch orders',
      },
    });
  }
});

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;

    const order = await orderService.getOrderById(orderId, userId);

    // Convert amounts from paise to rupees
    const orderInRupees = convertOrderToRupees(order);

    res.json({
      success: true,
      data: orderInRupees,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch order',
        },
      });
    }
  }
});

/**
 * Cancel order (customer)
 * POST /api/v1/orders/:id/cancel
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;
    const cancelData: CancelOrderRequest = req.body;

    // For customer cancellations, use customer email/ID
    const updatedOrder = await orderService.cancelOrder(orderId, cancelData.reason, `user-${userId}`, userId);

    // Convert amounts from paise to rupees
    const orderInRupees = convertOrderToRupees(updatedOrder);

    res.json({
      success: true,
      message: 'Order canceled successfully',
      data: orderInRupees,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel order',
        },
      });
    }
  }
});

/**
 * Payment webhook handler
 * POST /api/v1/orders/webhook/payment
 */
router.post('/webhook/payment', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = req.body;

    // Handle different webhook events
    if (payload.event === 'payment.captured') {
      const { order_id, id: payment_id } = payload.payload.payment.entity;
      
      await orderService.handlePaymentSuccess(
        order_id,
        payment_id,
        signature
      );
    } else if (payload.event === 'payment.failed') {
      const { order_id } = payload.payload.payment.entity;
      await orderService.handlePaymentFailure(order_id);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook',
      },
    });
  }
});

/**
 * Verify payment (client-side verification)
 * POST /api/v1/orders/verify-payment
 */
router.post('/verify-payment', authenticate, async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    await orderService.handlePaymentSuccess(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify payment',
        },
      });
    }
  }
});

// ============= Admin Routes =============

/**
 * Get all orders (admin)
 * GET /api/v1/orders/admin/all
 * GET /api/v1/admin/orders (when mounted at /admin/orders)
 * NOTE: This route must come BEFORE /:id to avoid matching "all" as an ID
 */
const getAllOrdersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'created_at'; // Use snake_case by default
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.minAmount) filters.minAmount = parseInt(req.query.minAmount as string);
    if (req.query.maxAmount) filters.maxAmount = parseInt(req.query.maxAmount as string);

    const result = await orderService.getAllOrders(filters, page, pageSize, sortBy, sortOrder);

    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
        totalItems: result.total,
      },
    });
  } catch (error) {
    next(error); // Pass error to error handler middleware
  }
};

router.get('/admin/all', ...requireAdmin, getAllOrdersHandler);

/**
 * Get available delivery personnel (admin)
 * GET /api/v1/orders/admin/delivery-personnel
 * NOTE: This MUST be defined BEFORE /admin/:id to avoid route conflicts
 */
router.get('/admin/delivery-personnel', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const all = req.query.all === 'true';
    
    const personnel = await orderService.getAvailableDeliveryPersonnel(all);

    res.json({
      success: true,
      data: personnel,
    });
  } catch (error: any) {
    console.error('Error fetching delivery personnel:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch delivery personnel',
        details: error.message || String(error),
      },
    });
  }
});

/**
 * Get order details by ID (admin)
 * GET /api/v1/orders/admin/:id
 */
const getOrderDetailsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = req.params.id;

    const orderDetails = await orderService.getOrderDetails(orderId);

    res.json({
      success: true,
      data: orderDetails,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch order details',
        },
      });
    }
  }
};

router.get('/admin/:id', ...requireAdmin, getOrderDetailsHandler);

/**
 * Update order status (admin)
 * PUT /api/v1/orders/admin/:id/status
 */
router.put('/admin/:id/status', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = updateStatusSchema.parse(req.body);
    
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.updateOrderStatus(orderId, validatedData.status, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order status updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      const statusCode = error.statusCode === 400 ? 400 : error.statusCode === 404 ? 404 : 409;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update order status',
        },
      });
    }
  }
});

/**
 * Assign delivery person to order (admin)
 * PUT /api/v1/orders/admin/:id/delivery
 */
router.put('/admin/:id/delivery', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = assignDeliverySchema.parse(req.body);
    
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.assignDeliveryPerson(orderId, validatedData.deliveryPersonId, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Delivery person assigned successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      const statusCode = error.statusCode === 404 ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign delivery person',
        },
      });
    }
  }
});

/**
 * Cancel order (admin)
 * PUT /api/v1/orders/admin/:id/cancel
 */
router.put('/admin/:id/cancel', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = cancelOrderSchema.parse(req.body);
    
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.cancelOrder(orderId, validatedData.reason, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      const statusCode = error.statusCode === 404 ? 404 : error.statusCode === 400 ? 400 : 409;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel order',
        },
      });
    }
  }
});

/**
 * Process order return (admin)
 * PUT /api/v1/orders/admin/:id/return
 */
router.put('/admin/:id/return', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = returnOrderSchema.parse(req.body);
    
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.processReturn(orderId, validatedData.reason, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order return processed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      const statusCode = error.statusCode === 404 ? 404 : error.statusCode === 400 ? 400 : 409;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process return',
        },
      });
    }
  }
});

/**
 * Add note to order (admin)
 * POST /api/v1/orders/admin/:id/notes
 */
router.post('/admin/:id/notes', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = addNoteSchema.parse(req.body);
    
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.addNote(orderId, validatedData.note, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Note added successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      const statusCode = error.statusCode === 404 ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.message,
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add note',
        },
      });
    }
  }
});

// ============================================================================
// ENHANCED ORDER MANAGEMENT ROUTES (Production-Ready)
// ============================================================================

/**
 * Put order on hold (admin)
 * PUT /api/v1/orders/admin/:id/hold
 */
router.put('/admin/:id/hold', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = putOnHoldSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.putOnHold(orderId, validatedData.reason, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order put on hold successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to put order on hold',
        },
      });
    }
  }
});

/**
 * Release order from hold (admin)
 * PUT /api/v1/orders/admin/:id/release-hold
 */
router.put('/admin/:id/release-hold', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.releaseHold(orderId, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order hold released successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to release order hold',
        },
      });
    }
  }
});

/**
 * Mark order as ready for pickup (admin)
 * PUT /api/v1/orders/admin/:id/ready-for-pickup
 */
router.put('/admin/:id/ready-for-pickup', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.markReadyForPickup(orderId, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Order marked as ready for pickup',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark order ready for pickup',
        },
      });
    }
  }
});

/**
 * Record delivery attempt (admin)
 * POST /api/v1/orders/admin/:id/delivery-attempt
 */
router.post('/admin/:id/delivery-attempt', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = recordDeliveryAttemptSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.recordDeliveryAttempt(
      orderId,
      validatedData.reason,
      validatedData.notes,
      adminEmail,
      adminId
    );

    res.json({
      success: true,
      message: 'Delivery attempt recorded successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record delivery attempt',
        },
      });
    }
  }
});

/**
 * Retry delivery (admin)
 * PUT /api/v1/orders/admin/:id/retry-delivery
 */
router.put('/admin/:id/retry-delivery', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = retryDeliverySchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    const newDeliveryTime = validatedData.newDeliveryTime 
      ? new Date(validatedData.newDeliveryTime) 
      : undefined;

    await orderService.retryDelivery(
      orderId,
      newDeliveryTime,
      validatedData.deliveryPersonnelId,
      adminEmail,
      adminId
    );

    res.json({
      success: true,
      message: 'Delivery retry scheduled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retry delivery',
        },
      });
    }
  }
});

/**
 * Request return (customer)
 * POST /api/v1/orders/:id/return-request
 */
router.post('/:id/return-request', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = requestReturnSchema.parse(req.body);
    const userId = req.user!.id;
    const orderId = req.params.id;

    await orderService.requestReturn(orderId, validatedData.reason, userId);

    res.json({
      success: true,
      message: 'Return request submitted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to request return',
        },
      });
    }
  }
});

/**
 * Approve return (admin)
 * PUT /api/v1/orders/admin/:id/return/approve
 */
router.put('/admin/:id/return/approve', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = approveReturnSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.approveReturn(orderId, validatedData.notes, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Return approved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to approve return',
        },
      });
    }
  }
});

/**
 * Reject return (admin)
 * PUT /api/v1/orders/admin/:id/return/reject
 */
router.put('/admin/:id/return/reject', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = rejectReturnSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.rejectReturn(orderId, validatedData.reason, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Return rejected successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject return',
        },
      });
    }
  }
});

/**
 * Schedule return pickup (admin)
 * PUT /api/v1/orders/admin/:id/return/schedule-pickup
 */
router.put('/admin/:id/return/schedule-pickup', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = scheduleReturnPickupSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    const pickupTime = new Date(validatedData.pickupTime);

    await orderService.scheduleReturnPickup(orderId, pickupTime, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Return pickup scheduled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to schedule return pickup',
        },
      });
    }
  }
});

/**
 * Complete return (admin)
 * PUT /api/v1/orders/admin/:id/return/complete
 */
router.put('/admin/:id/return/complete', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = completeReturnSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.completeReturn(orderId, validatedData.restockItems, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Return completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete return',
        },
      });
    }
  }
});

/**
 * Initiate refund (admin)
 * POST /api/v1/orders/admin/:id/refund/initiate
 */
router.post('/admin/:id/refund/initiate', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = initiateRefundSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.initiateRefund(orderId, validatedData.amount, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Refund initiated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to initiate refund',
        },
      });
    }
  }
});

/**
 * Complete refund (admin)
 * PUT /api/v1/orders/admin/:id/refund/complete
 */
router.put('/admin/:id/refund/complete', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = completeRefundSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.completeRefund(orderId, validatedData.refundReference, adminEmail, adminId);

    res.json({
      success: true,
      message: 'Refund completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to complete refund',
        },
      });
    }
  }
});

/**
 * Log customer contact (admin)
 * POST /api/v1/orders/admin/:id/contact-customer
 */
router.post('/admin/:id/contact-customer', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = contactCustomerSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.contactCustomer(
      orderId,
      validatedData.method,
      validatedData.message,
      adminEmail,
      adminId
    );

    res.json({
      success: true,
      message: 'Customer contact logged successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to log customer contact',
        },
      });
    }
  }
});

/**
 * Update delivery instructions (admin)
 * PUT /api/v1/orders/admin/:id/delivery-instructions
 */
router.put('/admin/:id/delivery-instructions', ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = updateDeliveryInstructionsSchema.parse(req.body);
    const adminId = req.user!.id;
    const adminEmail = await getAdminEmail(req);
    const orderId = req.params.id;

    await orderService.updateDeliveryInstructions(
      orderId,
      validatedData.instructions,
      adminEmail,
      adminId
    );

    res.json({
      success: true,
      message: 'Delivery instructions updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
      });
    } else if (error instanceof AppError) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update delivery instructions',
        },
      });
    }
  }
});

export default router;
