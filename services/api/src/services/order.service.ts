import { getDatabase } from '@shambit/database';
import { BadRequestError, NotFoundError, InternalServerError } from '@shambit/shared';
import { Knex } from 'knex';
import {
  CreateOrderRequest,
  Order,
  OrderWithItems,
  OrderStatus,
  PaymentStatus,
  UpdateOrderStatusRequest,
  CancelOrderRequest,
  ReturnOrderRequest,
  PaymentGatewayOrder,
  ReconciliationRecord,
  OrderItemRecord,
  OrderDetails,
  OrderHistoryEntry,
  DeliveryPerson,
  AssignDeliveryRequest,
  AddNoteRequest,
} from '../types/order.types';
import { inventoryService } from './inventory.service';
import { paymentService } from './payment.service';
import { promotionService } from './promotion.service';
import { notificationService } from './notification.service';
import { settingsService } from './settings.service';
import { logger } from '../config/logger.config';

// Lazy database getter to avoid initialization issues
const getDb = () => getDatabase();

/**
 * Map database row to Order object (snake_case to camelCase)
 * Converts amounts from paise to rupees
 */
function mapOrderFromDb(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    status: row.status,
    deliveryAddressId: row.delivery_address_id,
    deliveryAddress: row.delivery_address,
    subtotal: row.subtotal / 100,
    taxAmount: row.tax_amount / 100,
    deliveryFee: row.delivery_fee / 100,
    discountAmount: row.discount_amount / 100,
    totalAmount: row.total_amount / 100,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentId: row.payment_id,
    promoCode: row.promo_code,
    offerId: row.offer_id,
    deliveryPersonnelId: row.delivery_personnel_id,
    estimatedDeliveryTime: row.estimated_delivery_time,
    actualDeliveryTime: row.actual_delivery_time,
    
    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    deliveredAt: row.delivered_at,
    canceledAt: row.canceled_at,
    
    // Hold Management
    onHoldReason: row.on_hold_reason,
    onHoldAt: row.on_hold_at,
    
    // Enhanced Delivery Tracking
    readyForPickupAt: row.ready_for_pickup_at,
    deliveryAttemptedAt: row.delivery_attempted_at,
    deliveryAttemptCount: row.delivery_attempt_count,
    deliveryFailureReason: row.delivery_failure_reason,
    deliveryInstructions: row.delivery_instructions,
    deliveryInstructionsUpdatedAt: row.delivery_instructions_updated_at,
    
    // Return Management
    returnRequestedAt: row.return_requested_at,
    returnApprovedAt: row.return_approved_at,
    returnRejectedAt: row.return_rejected_at,
    returnReason: row.return_reason,
    returnNotes: row.return_notes,
    returnApprovedBy: row.return_approved_by,
    
    // Refund Tracking
    refundInitiatedAt: row.refund_initiated_at,
    refundCompletedAt: row.refund_completed_at,
    refundAmount: row.refund_amount ? row.refund_amount / 100 : undefined,
    refundReference: row.refund_reference,
    refundNotes: row.refund_notes,
  };
}

/**
 * Map database row to OrderItem object
 * Converts amounts from paise to rupees
 */
function mapOrderItemFromDb(row: any): OrderItemRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    productImage: row.product_image,
    unitPrice: row.unit_price / 100,
    quantity: row.quantity,
    totalPrice: row.total_price / 100,
  };
}

class OrderService {
  /**
   * Log action to order history - Enhanced with all action types
   */
  private async logOrderHistory(
    params: {
      orderId: string;
      actionType: 
        | 'order_created'
        | 'status_change'
        | 'payment_status_change'
        | 'delivery_assignment'
        | 'delivery_attempt'
        | 'on_hold'
        | 'hold_released'
        | 'cancellation'
        | 'return_request'
        | 'return_approval'
        | 'return_rejection'
        | 'return_pickup'
        | 'return_complete'
        | 'refund_initiated'
        | 'refund_completed'
        | 'note'
        | 'customer_contact'
        | 'item_substitution';
      oldValue?: string;
      newValue?: string;
      reason?: string;
      note?: string;
      adminId?: string;
      adminEmail?: string;
    },
    trx?: Knex.Transaction
  ): Promise<void> {
    const db = trx || getDb();
    
    // Only include admin_id if it's actually an admin (not a customer user ID)
    // Customer actions will have adminEmail like "user-{userId}"
    const isCustomerAction = params.adminEmail?.startsWith('user-');
    
    await db('order_history').insert({
      order_id: params.orderId,
      action_type: params.actionType,
      old_value: params.oldValue,
      new_value: params.newValue,
      reason: params.reason,
      note: params.note,
      admin_id: isCustomerAction ? null : params.adminId,
      admin_email: params.adminEmail,
    });

    logger.info('Order history logged', {
      orderId: params.orderId,
      actionType: params.actionType,
      adminEmail: params.adminEmail,
      isCustomerAction,
    });
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await getDb()('orders')
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .count('* as count')
      .first();

    const orderCount = parseInt(count?.count as string || '0') + 1;
    return `ORD-${year}-${orderCount.toString().padStart(6, '0')}`;
  }

  /**
   * Calculate order totals
   */
  private async calculateTotals(
    subtotal: number,
    discountAmount: number = 0
  ): Promise<{ taxAmount: number; deliveryFee: number; totalAmount: number }> {
    // Get tax rate from settings
    const taxRate = await settingsService.getTaxRate();
    const taxAmount = Math.round(subtotal * (taxRate / 100));

    // Get delivery fee from settings (considers free delivery threshold)
    const deliveryFee = await settingsService.getDeliveryFee(subtotal);

    // Total amount
    const totalAmount = subtotal + taxAmount + deliveryFee - discountAmount;

    return { taxAmount, deliveryFee, totalAmount };
  }

  /**
   * Validate cart items and calculate subtotal
   */
  private async validateCartAndCalculateSubtotal(
    items: { productId: string; quantity: number }[]
  ): Promise<{ subtotal: number; validatedItems: any[] }> {
    if (!items || items.length === 0) {
      throw new BadRequestError('Cart is empty', 'EMPTY_CART');
    }

    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      // Fetch product details
      const product = await getDb()('products')
        .where({ id: item.productId, is_active: true })
        .first();

      if (!product) {
        throw new BadRequestError(`Product ${item.productId} not found or inactive`, 'PRODUCT_NOT_FOUND');
      }

      // Check inventory availability
      const inventory = await getDb()('inventory')
        .where({ product_id: item.productId })
        .first();

      if (!inventory || inventory.available_stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for product ${product.name}. Available: ${inventory?.available_stock || 0}`,
          'INSUFFICIENT_STOCK'
        );
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image_urls?.[0] || null,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
      });
    }

    return { subtotal, validatedItems };
  }

  /**
   * Create a new order
   */
  async createOrder(
    userId: string,
    orderData: CreateOrderRequest
  ): Promise<{ order: OrderWithItems; paymentDetails?: PaymentGatewayOrder }> {
    const trx = await getDb().transaction();

    try {
      // Check if user is blocked
      const user = await trx('users')
        .where({ id: userId })
        .first();

      if (!user) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }

      if (user.is_blocked) {
        throw new BadRequestError(
          'Your account has been blocked. Please contact support for assistance.',
          'ACCOUNT_BLOCKED'
        );
      }

      // Validate delivery address
      const address = await trx('user_addresses')
        .where({ id: orderData.deliveryAddressId, user_id: userId })
        .first();

      if (!address) {
        throw new BadRequestError('Invalid delivery address', 'INVALID_ADDRESS');
      }

      // Validate cart and calculate subtotal
      const { subtotal, validatedItems } = await this.validateCartAndCalculateSubtotal(
        orderData.items
      );

      // Apply promo code if provided
      let discountAmount = 0;
      let promotionId: string | undefined;
      if (orderData.promoCode) {
        const validationResult = await promotionService.validatePromotion({
          code: orderData.promoCode,
          userId,
          orderAmount: subtotal,
        });

        if (!validationResult.valid) {
          throw new BadRequestError(
            validationResult.error || 'Invalid promo code',
            validationResult.errorCode || 'INVALID_PROMO_CODE'
          );
        }

        discountAmount = validationResult.discountAmount || 0;
        promotionId = validationResult.promotion?.id;
        
        logger.info('Promo code applied', {
          code: orderData.promoCode,
          discountAmount,
          userId,
        });
      }

      // Calculate totals
      const { taxAmount, deliveryFee, totalAmount } = await this.calculateTotals(subtotal, discountAmount);

      // Reserve inventory using the inventory service
      const reservationId = await inventoryService.reserveInventory(
        userId,
        validatedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      );

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Determine initial status based on payment method
      const initialStatus: OrderStatus = orderData.paymentMethod === 'cod' ? 'confirmed' : 'pending';
      const paymentStatus: PaymentStatus = orderData.paymentMethod === 'cod' ? 'pending' : 'pending';

      // Create order
      const [order] = await trx('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          status: initialStatus,
          delivery_address_id: orderData.deliveryAddressId,
          delivery_address: JSON.stringify(address),
          subtotal,
          tax_amount: taxAmount,
          delivery_fee: deliveryFee,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: orderData.paymentMethod,
          payment_status: paymentStatus,
          promo_code: orderData.promoCode,
          offer_id: orderData.offerId || null,
          estimated_delivery_time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        })
        .returning('*');

      // Create order items
      const orderItems = validatedItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        total_price: item.totalPrice,
      }));

      const insertedItems = await trx('order_items').insert(orderItems).returning('*');

      // Log order creation to order history
      await this.logOrderHistory({
        orderId: order.id,
        actionType: 'order_created',
      }, trx);

      // If COD, commit inventory immediately
      if (orderData.paymentMethod === 'cod') {
        await inventoryService.commitReservation(reservationId);
        
        // Record promotion usage if promo code was applied
        if (promotionId && discountAmount > 0) {
          await promotionService.recordPromotionUsage(
            promotionId,
            userId,
            order.id,
            discountAmount
          );
        }
        
        // Clear cart after successful COD order
        await trx('cart_items')
          .where('user_id', userId)
          .delete();
        
        // Clear applied promo code from cart
        await trx('cart_promo_codes')
          .where('user_id', userId)
          .delete();
        
        await trx.commit();

        logger.info('Cart cleared after COD order', {
          orderId: order.id,
          userId,
        });

        const mappedOrder = mapOrderFromDb(order);
        const mappedItems = insertedItems.map(mapOrderItemFromDb);

        return {
          order: {
            ...mappedOrder,
            items: mappedItems,
          },
        };
      }

      // For online payment, create Razorpay order
      const razorpayOrder = await paymentService.createOrder({
        amount: totalAmount,
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          orderId: order.id,
          userId,
        },
      });

      // Update order with payment gateway order ID
      await trx('orders')
        .where({ id: order.id })
        .update({
          payment_id: razorpayOrder.id,
          status: 'payment_processing',
        });

      await trx.commit();

      logger.info('Order created successfully', {
        event: 'order_created',
        orderId: order.id,
        orderNumber,
        userId,
        totalAmount,
        paymentMethod: orderData.paymentMethod,
        status: order.status,
        itemCount: validatedItems.length,
        promoCode: orderData.promoCode,
        discountAmount: discountAmount,
      });

      const mappedOrder = mapOrderFromDb(order);
      const mappedItems = insertedItems.map(mapOrderItemFromDb);

      return {
        order: {
          ...mappedOrder,
          paymentId: razorpayOrder.id,
          status: 'payment_processing' as OrderStatus,
          items: mappedItems,
        },
        paymentDetails: {
          razorpayOrderId: razorpayOrder.id,
          amount: totalAmount,
          currency: 'INR',
          receipt: orderNumber,
        },
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating order', { error, userId });
      throw error;
    }
  }

  /**
   * Handle payment success webhook
   */
  async handlePaymentSuccess(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Verify signature
      const isValid = paymentService.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        throw new BadRequestError('Invalid payment signature', 'INVALID_SIGNATURE');
      }

      // Find order
      const order = await trx('orders')
        .where({ payment_id: razorpayOrderId })
        .first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.payment_status === 'completed') {
        logger.info('Payment already processed', { orderId: order.id });
        await trx.commit();
        return;
      }

      // Update order status
      await trx('orders')
        .where({ id: order.id })
        .update({
          status: 'confirmed',
          payment_status: 'completed',
          payment_id: razorpayPaymentId,
          confirmed_at: new Date(),
        });

      // Commit inventory reservations
      const reservations = await trx('inventory_reservations')
        .where({ user_id: order.user_id, status: 'active' })
        .whereRaw('created_at >= ?', [order.created_at]);

      for (const reservation of reservations) {
        await inventoryService.commitReservation(reservation.id);
      }

      // Record promotion usage if promo code was used
      if (order.promo_code && order.discount_amount > 0) {
        try {
          const promotion = await promotionService.getPromotionByCode(order.promo_code);
          await promotionService.recordPromotionUsage(
            promotion.id,
            order.user_id,
            order.id,
            order.discount_amount
          );
        } catch (error) {
          logger.error('Error recording promotion usage', { error, orderId: order.id });
          // Don't fail the payment processing if promotion recording fails
        }
      }

      // Clear cart after successful online payment
      await trx('cart_items')
        .where('user_id', order.user_id)
        .delete();
      
      // Clear applied promo code from cart
      await trx('cart_promo_codes')
        .where('user_id', order.user_id)
        .delete();

      await trx.commit();

      logger.info('Cart cleared after successful payment', {
        orderId: order.id,
        userId: order.user_id,
      });

      logger.info('Payment processed successfully', {
        orderId: order.id,
        paymentId: razorpayPaymentId,
      });

      // Send payment success and order confirmation notifications (push + SMS)
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'payment_success',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            amount: order.total_amount,
          },
          channels: ['push', 'sms'],
        });

        await notificationService.sendOrderStatusNotification(
          order.user_id,
          order.id,
          order.order_number,
          'confirmed'
        );
      } catch (error) {
        logger.error('Failed to send payment/order confirmation notification', {
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the payment processing if notification fails
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error handling payment success', { error, razorpayOrderId });
      throw error;
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(razorpayOrderId: string): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Find order
      const order = await trx('orders')
        .where({ payment_id: razorpayOrderId })
        .first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Update order status
      await trx('orders')
        .where({ id: order.id })
        .update({
          status: 'failed',
          payment_status: 'failed',
        });

      // Release inventory reservations
      const reservations = await trx('inventory_reservations')
        .where({ user_id: order.user_id, status: 'active' })
        .whereRaw('created_at >= ?', [order.created_at]);

      for (const reservation of reservations) {
        await inventoryService.releaseReservation(reservation.id);
      }

      await trx.commit();

      logger.info('Payment failure handled', { orderId: order.id });

      // Send payment failure notification (push + SMS)
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'payment_failed',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send payment failure notification', {
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the payment failure handling if notification fails
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error handling payment failure', { error, razorpayOrderId });
      throw error;
    }
  }

  /**
   * Get order by ID (with timeline for customer view)
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderWithItems> {
    const db = getDb();
    const query = db('orders').where({ 'orders.id': orderId });

    if (userId) {
      query.where({ 'orders.user_id': userId });
    }

    const order = await query.first();

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    const items = await db('order_items').where({ order_id: orderId });

    // Get order history timeline (same as admin view, but filtered for customer)
    const timeline = await db('order_history')
      .where({ order_id: orderId })
      .orderBy('created_at', 'asc')
      .select('*');

    // Map timeline entries
    const mappedTimeline: OrderHistoryEntry[] = timeline.map((entry: any) => ({
      id: entry.id,
      actionType: entry.action_type,
      oldValue: entry.old_value,
      newValue: entry.new_value,
      reason: entry.reason,
      note: entry.note,
      adminId: entry.admin_id,
      adminEmail: entry.admin_email,
      createdAt: entry.created_at,
    }));

    const mappedOrder = mapOrderFromDb(order);
    const mappedItems = items.map(mapOrderItemFromDb);

    const result: OrderWithItems = {
      ...mappedOrder,
      items: mappedItems,
      timeline: mappedTimeline,
    };

    return result;
  }

  /**
   * Get complete order details with timeline (for admin)
   */
  async getOrderDetails(orderId: string): Promise<OrderDetails> {
    const db = getDb();

    // Get order with customer details
    const order = await db('orders')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .leftJoin('delivery_personnel', 'orders.delivery_personnel_id', 'delivery_personnel.id')
      .where({ 'orders.id': orderId })
      .select(
        'orders.*',
        'users.name as customer_name',
        'users.mobile_number as customer_mobile',
        'users.email as customer_email',
        'delivery_personnel.name as delivery_person_name',
        'delivery_personnel.mobile_number as delivery_person_mobile',
        'delivery_personnel.email as delivery_person_email'
      )
      .first();

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    // Get order items
    const items = await db('order_items').where({ order_id: orderId });

    // Get order history timeline
    const timeline = await db('order_history')
      .where({ order_id: orderId })
      .orderBy('created_at', 'desc')
      .select('*');

    // Map timeline entries
    const mappedTimeline: OrderHistoryEntry[] = timeline.map((entry: any) => ({
      id: entry.id,
      actionType: entry.action_type,
      oldValue: entry.old_value,
      newValue: entry.new_value,
      reason: entry.reason,
      note: entry.note,
      adminId: entry.admin_id,
      adminEmail: entry.admin_email,
      createdAt: entry.created_at,
    }));

    // Map order items
    const mappedItems = items.map(mapOrderItemFromDb);

    // Parse delivery address
    const deliveryAddress = typeof order.delivery_address === 'string' 
      ? JSON.parse(order.delivery_address) 
      : order.delivery_address;

    // Build complete order details (convert amounts from paise to rupees)
    const orderDetails: OrderDetails = {
      id: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      status: order.status,
      deliveryAddressId: order.delivery_address_id,
      deliveryAddress: deliveryAddress,
      subtotal: order.subtotal / 100,
      taxAmount: order.tax_amount / 100,
      deliveryFee: order.delivery_fee / 100,
      discountAmount: order.discount_amount / 100,
      totalAmount: order.total_amount / 100,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentId: order.payment_id,
      promoCode: order.promo_code,
      deliveryPersonnelId: order.delivery_personnel_id,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      confirmedAt: order.confirmed_at,
      deliveredAt: order.delivered_at,
      canceledAt: order.canceled_at,
      customer: {
        id: order.user_id,
        name: order.customer_name,
        mobileNumber: order.customer_mobile,
        email: order.customer_email,
      },
      items: mappedItems,
      timeline: mappedTimeline,
    };

    // Add delivery person if assigned
    if (order.delivery_personnel_id && order.delivery_person_name) {
      orderDetails.deliveryPerson = {
        id: order.delivery_personnel_id,
        name: order.delivery_person_name,
        mobileNumber: order.delivery_person_mobile,
        email: order.delivery_person_email,
      };
    }

    return orderDetails;
  }

  /**
   * Get orders for a user
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const orders = await getDb()('orders')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await getDb()('orders')
      .where({ user_id: userId })
      .count('* as count');

    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await getDb()('order_items').where({ order_id: order.id });
        const mappedOrder = mapOrderFromDb(order);
        const mappedItems = items.map(mapOrderItemFromDb);
        return { ...mappedOrder, items: mappedItems };
      })
    );

    return {
      orders: ordersWithItems,
      total: parseInt(count as string),
    };
  }

  /**
   * Get all orders (admin)
   */
  async getAllOrders(
    filters: {
      status?: OrderStatus;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    } = {},
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    const offset = (page - 1) * pageSize;

    // Map camelCase to snake_case for database columns
    const columnMapping: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'totalAmount': 'total_amount',
      'orderNumber': 'order_number',
      'userId': 'user_id',
      'paymentStatus': 'payment_status',
      'paymentMethod': 'payment_method',
    };

    const dbSortBy = columnMapping[sortBy] || sortBy;
    let query = getDb()('orders').orderBy(dbSortBy, sortOrder);

    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    if (filters.minAmount) {
      query = query.where('total_amount', '>=', filters.minAmount);
    }

    if (filters.maxAmount) {
      query = query.where('total_amount', '<=', filters.maxAmount);
    }

    const orders = await query.clone().limit(pageSize).offset(offset);

    // Create a separate query for count without ORDER BY
    let countQuery = getDb()('orders');

    if (filters.status) {
      countQuery = countQuery.where({ status: filters.status });
    }

    if (filters.startDate) {
      countQuery = countQuery.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      countQuery = countQuery.where('created_at', '<=', filters.endDate);
    }

    if (filters.minAmount) {
      countQuery = countQuery.where('total_amount', '>=', filters.minAmount);
    }

    if (filters.maxAmount) {
      countQuery = countQuery.where('total_amount', '<=', filters.maxAmount);
    }

    const [{ count }] = await countQuery.count('* as count');

    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await getDb()('order_items').where({ order_id: order.id });
        const mappedOrder = mapOrderFromDb(order);
        const mappedItems = items.map(mapOrderItemFromDb);
        return { ...mappedOrder, items: mappedItems };
      })
    );

    return {
      orders: ordersWithItems,
      total: parseInt(count as string),
    };
  }

  /**
   * Update order status (admin) - Enhanced with history logging
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Validate status transition
      this.validateStatusTransition(order.status, newStatus);

      const oldStatus = order.status;

      const updateData: any = {
        status: newStatus,
        updated_at: new Date(),
      };

      if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date();
        updateData.actual_delivery_time = new Date();
      } else if (newStatus === 'canceled') {
        updateData.canceled_at = new Date();
      }

      await trx('orders')
        .where({ id: orderId })
        .update(updateData);

      // Log status change to order history
      await this.logOrderHistory({
        orderId,
        actionType: 'status_change',
        oldValue: oldStatus,
        newValue: newStatus,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Order status updated', {
        event: 'order_status_changed',
        orderId,
        orderNumber: order.order_number,
        oldStatus,
        newStatus,
        adminEmail,
        adminId,
        userId: order.user_id,
      });

      // Send notification to customer
      try {
        await notificationService.sendOrderStatusNotification(
          order.user_id,
          orderId,
          order.order_number,
          newStatus
        );
      } catch (error) {
        logger.error('Failed to send order status notification', {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the order update if notification fails
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating order status', { error, orderId });
      throw error;
    }
  }

  /**
   * Assign delivery person to order
   */
  async assignDeliveryPerson(
    orderId: string,
    deliveryPersonId: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Validate order status is preparing or out_for_delivery
      if (order.status !== 'preparing' && order.status !== 'out_for_delivery') {
        throw new BadRequestError(
          `Cannot assign delivery person to order with status ${order.status}`,
          'INVALID_ORDER_STATUS'
        );
      }

      // Validate delivery person exists
      const deliveryPerson = await trx('delivery_personnel')
        .where({ id: deliveryPersonId, is_active: true })
        .first();

      if (!deliveryPerson) {
        throw new NotFoundError('Delivery person not found or inactive', 'DELIVERY_PERSON_NOT_FOUND');
      }

      // Update order with delivery person
      await trx('orders')
        .where({ id: orderId })
        .update({
          delivery_personnel_id: deliveryPersonId,
          updated_at: new Date(),
        });

      // Log assignment to order history
      await this.logOrderHistory({
        orderId,
        actionType: 'delivery_assignment',
        newValue: deliveryPerson.name,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Delivery person assigned', {
        orderId,
        orderNumber: order.order_number,
        deliveryPersonId,
        deliveryPersonName: deliveryPerson.name,
        adminEmail,
        adminId,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error assigning delivery person', { error, orderId });
      throw error;
    }
  }

  /**
   * Cancel order - Enhanced with history logging
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    adminEmail: string,
    adminId?: string
  ): Promise<OrderWithItems> {
    const trx = await getDb().transaction();

    try {
      // Validate reason is provided and not empty
      const trimmedReason = reason?.trim();
      if (!trimmedReason) {
        throw new BadRequestError('Cancellation reason is required', 'REASON_REQUIRED');
      }

      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Validate order is not delivered, cancelled, or returned
      if (order.status === 'delivered' || order.status === 'canceled' || order.status === 'returned') {
        throw new BadRequestError(
          `Order cannot be canceled in ${order.status} status`,
          'CANNOT_CANCEL_ORDER'
        );
      }

      const oldStatus = order.status;

      // Update order status
      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'canceled',
          canceled_at: new Date(),
          updated_at: new Date(),
        });

      // Log cancellation with reason to order history
      await this.logOrderHistory({
        orderId,
        actionType: 'cancellation',
        oldValue: oldStatus,
        newValue: 'canceled',
        reason: trimmedReason,
        adminId,
        adminEmail,
      }, trx);

      // If payment was completed, initiate refund
      if (order.payment_status === 'completed' && order.payment_id) {
        await paymentService.initiateRefund(order.payment_id, order.total_amount);
        await trx('orders')
          .where({ id: orderId })
          .update({ payment_status: 'refunded' });
      }

      // Release or restock inventory
      if (order.status === 'confirmed' || order.status === 'preparing') {
        // Inventory was committed, need to restock
        const items = await trx('order_items').where({ order_id: orderId });
        for (const item of items) {
          await trx('inventory')
            .where({ product_id: item.product_id })
            .increment('available_stock', item.quantity)
            .increment('total_stock', item.quantity);
        }
      } else {
        // Inventory was only reserved, release it
        const reservations = await trx('inventory_reservations')
          .where({ user_id: order.user_id, status: 'active' })
          .whereRaw('created_at >= ?', [order.created_at]);

        for (const reservation of reservations) {
          await inventoryService.releaseReservation(reservation.id);
        }
      }

      await trx.commit();

      logger.info('Order canceled', {
        event: 'order_canceled',
        orderId,
        orderNumber: order.order_number,
        reason: trimmedReason,
        adminEmail,
        adminId,
        previousStatus: oldStatus,
        refundInitiated: order.payment_status === 'completed',
      });

      // Return the updated order with items
      return await this.getOrderById(orderId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error canceling order', { error, orderId });
      throw error;
    }
  }

  /**
   * Process order return (admin) - Enhanced with history logging
   */
  async processReturn(
    orderId: string,
    reason: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Validate reason is provided and not empty
      const trimmedReason = reason?.trim();
      if (!trimmedReason) {
        throw new BadRequestError('Return reason is required', 'REASON_REQUIRED');
      }

      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Validate order status is delivered
      if (order.status !== 'delivered') {
        throw new BadRequestError('Only delivered orders can be returned', 'CANNOT_RETURN_ORDER');
      }

      // Update order status
      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'returned',
          updated_at: new Date(),
        });

      // Log return with reason to order history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_complete',
        oldValue: 'delivered',
        newValue: 'returned',
        reason: trimmedReason,
        adminId,
        adminEmail,
      }, trx);

      // Initiate refund
      if (order.payment_status === 'completed' && order.payment_id) {
        await paymentService.initiateRefund(order.payment_id, order.total_amount);
        await trx('orders')
          .where({ id: orderId })
          .update({ payment_status: 'refunded' });
      }

      // Restock items
      const items = await trx('order_items').where({ order_id: orderId });
      for (const item of items) {
        await trx('inventory')
          .where({ product_id: item.product_id })
          .increment('available_stock', item.quantity)
          .increment('total_stock', item.quantity);

        // Log inventory history
        await trx('inventory_history').insert({
          product_id: item.product_id,
          change_type: 'return',
          quantity_change: item.quantity,
          previous_stock: 0, // Would need to fetch current stock
          new_stock: 0, // Would need to calculate
          performed_by: adminId,
          reason: `Order return: ${trimmedReason}`,
        });
      }

      await trx.commit();

      logger.info('Order returned', {
        event: 'order_returned',
        orderId,
        orderNumber: order.order_number,
        reason: trimmedReason,
        adminEmail,
        adminId,
        refundInitiated: order.payment_status === 'completed',
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error processing order return', { error, orderId });
      throw error;
    }
  }

  /**
   * Add note to order timeline
   */
  async addNote(
    orderId: string,
    note: string,
    adminEmail: string,
    adminId: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Trim whitespace from note
      const trimmedNote = note?.trim();

      // Validate note is not empty after trimming
      if (!trimmedNote) {
        throw new BadRequestError('Note cannot be empty', 'EMPTY_NOTE');
      }

      // Validate note length <= 500 characters
      if (trimmedNote.length > 500) {
        throw new BadRequestError('Note cannot exceed 500 characters', 'NOTE_TOO_LONG');
      }

      // Verify order exists
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Log note to order_history with admin details
      await this.logOrderHistory({
        orderId,
        actionType: 'note',
        note: trimmedNote,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Note added to order', {
        orderId,
        orderNumber: order.order_number,
        adminEmail,
        adminId,
        noteLength: trimmedNote.length,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error adding note to order', { error, orderId });
      throw error;
    }
  }

  /**
   * Put order on hold
   */
  async putOnHold(
    orderId: string,
    reason: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Validate order can be put on hold
      const allowedStatuses: OrderStatus[] = ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivery_attempted'];
      if (!allowedStatuses.includes(order.status)) {
        throw new BadRequestError(
          `Cannot put order on hold from status ${order.status}`,
          'INVALID_STATUS_FOR_HOLD'
        );
      }

      const oldStatus = order.status;

      // Update order
      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'on_hold',
          on_hold_reason: reason,
          on_hold_at: new Date(),
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'on_hold',
        oldValue: oldStatus,
        newValue: 'on_hold',
        reason,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Order put on hold', {
        orderId,
        orderNumber: order.order_number,
        previousStatus: oldStatus,
        reason,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'order_on_hold',
          data: {
            orderId,
            orderNumber: order.order_number,
            reason,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send on hold notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error putting order on hold', { error, orderId });
      throw error;
    }
  }

  /**
   * Release order from hold
   */
  async releaseHold(
    orderId: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'on_hold') {
        throw new BadRequestError('Order is not on hold', 'ORDER_NOT_ON_HOLD');
      }

      // Determine next status based on what was done before hold
      // Default to preparing if we can't determine
      const nextStatus: OrderStatus = 'preparing';

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: nextStatus,
          on_hold_reason: null,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'hold_released',
        oldValue: 'on_hold',
        newValue: nextStatus,
        note: `Hold released, resuming to ${nextStatus}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Order hold released', {
        orderId,
        orderNumber: order.order_number,
        nextStatus,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error releasing order hold', { error, orderId });
      throw error;
    }
  }

  /**
   * Mark order as ready for pickup
   */
  async markReadyForPickup(
    orderId: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'preparing') {
        throw new BadRequestError(
          `Cannot mark order as ready for pickup from status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'ready_for_pickup',
          ready_for_pickup_at: new Date(),
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'status_change',
        oldValue: 'preparing',
        newValue: 'ready_for_pickup',
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Order marked ready for pickup', {
        orderId,
        orderNumber: order.order_number,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error marking order ready for pickup', { error, orderId });
      throw error;
    }
  }

  /**
   * Record delivery attempt (failed delivery)
   */
  async recordDeliveryAttempt(
    orderId: string,
    reason: string,
    notes: string | undefined,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'out_for_delivery') {
        throw new BadRequestError(
          `Cannot record delivery attempt for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      const attemptCount = (order.delivery_attempt_count || 0) + 1;

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'delivery_attempted',
          delivery_attempted_at: new Date(),
          delivery_attempt_count: attemptCount,
          delivery_failure_reason: reason,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'delivery_attempt',
        oldValue: 'out_for_delivery',
        newValue: 'delivery_attempted',
        reason,
        note: notes || `Delivery attempt #${attemptCount} failed`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Delivery attempt recorded', {
        orderId,
        orderNumber: order.order_number,
        attemptCount,
        reason,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'delivery_failed',
          data: {
            orderId,
            orderNumber: order.order_number,
            reason,
            attemptCount,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send delivery attempt notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error recording delivery attempt', { error, orderId });
      throw error;
    }
  }

  /**
   * Retry delivery after failed attempt
   */
  async retryDelivery(
    orderId: string,
    newDeliveryTime: Date | undefined,
    deliveryPersonnelId: string | undefined,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'delivery_attempted') {
        throw new BadRequestError(
          `Cannot retry delivery for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      const updateData: any = {
        status: 'out_for_delivery',
        updated_at: new Date(),
      };

      if (newDeliveryTime) {
        updateData.estimated_delivery_time = newDeliveryTime;
      }

      if (deliveryPersonnelId) {
        updateData.delivery_personnel_id = deliveryPersonnelId;
      }

      await trx('orders')
        .where({ id: orderId })
        .update(updateData);

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'status_change',
        oldValue: 'delivery_attempted',
        newValue: 'out_for_delivery',
        note: `Delivery retry scheduled${newDeliveryTime ? ` for ${newDeliveryTime.toISOString()}` : ''}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Delivery retry scheduled', {
        orderId,
        orderNumber: order.order_number,
        newDeliveryTime,
        deliveryPersonnelId,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error retrying delivery', { error, orderId });
      throw error;
    }
  }

  /**
   * Request return (customer-initiated)
   */
  async requestReturn(
    orderId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId, user_id: userId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'delivered') {
        throw new BadRequestError(
          'Only delivered orders can be returned',
          'INVALID_STATUS_FOR_RETURN'
        );
      }

      // Check if return window is still open (e.g., 7 days)
      const deliveredAt = new Date(order.delivered_at);
      const daysSinceDelivery = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
      const returnWindowDays = 7;

      if (daysSinceDelivery > returnWindowDays) {
        throw new BadRequestError(
          `Return window of ${returnWindowDays} days has expired`,
          'RETURN_WINDOW_EXPIRED'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'return_requested',
          return_requested_at: new Date(),
          return_reason: reason,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_request',
        oldValue: 'delivered',
        newValue: 'return_requested',
        reason,
        adminEmail: `user-${userId}`,
      }, trx);

      await trx.commit();

      logger.info('Return requested', {
        orderId,
        orderNumber: order.order_number,
        reason,
        userId,
        daysSinceDelivery,
      });

      // Send notification to admin
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'return_requested',
          data: {
            orderId,
            orderNumber: order.order_number,
            reason,
          },
          channels: ['push'],
        });
      } catch (error) {
        logger.error('Failed to send return request notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error requesting return', { error, orderId });
      throw error;
    }
  }

  /**
   * Approve return (admin)
   */
  async approveReturn(
    orderId: string,
    notes: string | undefined,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'return_requested') {
        throw new BadRequestError(
          `Cannot approve return for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'return_approved',
          return_approved_at: new Date(),
          return_approved_by: adminId,
          return_notes: notes,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_approval',
        oldValue: 'return_requested',
        newValue: 'return_approved',
        note: notes,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Return approved', {
        orderId,
        orderNumber: order.order_number,
        adminEmail,
        notes,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'return_approved',
          data: {
            orderId,
            orderNumber: order.order_number,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send return approval notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error approving return', { error, orderId });
      throw error;
    }
  }

  /**
   * Reject return (admin)
   */
  async rejectReturn(
    orderId: string,
    reason: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'return_requested') {
        throw new BadRequestError(
          `Cannot reject return for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'return_rejected',
          return_rejected_at: new Date(),
          return_notes: reason,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_rejection',
        oldValue: 'return_requested',
        newValue: 'return_rejected',
        reason,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Return rejected', {
        orderId,
        orderNumber: order.order_number,
        reason,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'return_rejected',
          data: {
            orderId,
            orderNumber: order.order_number,
            reason,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send return rejection notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error rejecting return', { error, orderId });
      throw error;
    }
  }

  /**
   * Schedule return pickup
   */
  async scheduleReturnPickup(
    orderId: string,
    pickupTime: Date,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'return_approved') {
        throw new BadRequestError(
          `Cannot schedule pickup for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'return_pickup_scheduled',
          estimated_delivery_time: pickupTime, // Reuse this field for pickup time
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_pickup',
        oldValue: 'return_approved',
        newValue: 'return_pickup_scheduled',
        note: `Pickup scheduled for ${pickupTime.toISOString()}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Return pickup scheduled', {
        orderId,
        orderNumber: order.order_number,
        pickupTime,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'return_pickup_scheduled',
          data: {
            orderId,
            orderNumber: order.order_number,
            pickupTime,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send pickup schedule notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error scheduling return pickup', { error, orderId });
      throw error;
    }
  }

  /**
   * Complete return and restock items
   */
  async completeReturn(
    orderId: string,
    restockItems: boolean,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      const validStatuses: OrderStatus[] = ['return_pickup_scheduled', 'return_in_transit'];
      if (!validStatuses.includes(order.status)) {
        throw new BadRequestError(
          `Cannot complete return for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'returned',
          updated_at: new Date(),
        });

      // Restock items if requested
      if (restockItems) {
        const items = await trx('order_items').where({ order_id: orderId });
        for (const item of items) {
          await trx('inventory')
            .where({ product_id: item.product_id })
            .increment('available_stock', item.quantity)
            .increment('total_stock', item.quantity);

          // Log inventory history
          await trx('inventory_history').insert({
            product_id: item.product_id,
            change_type: 'return',
            quantity_change: item.quantity,
            performed_by: adminId,
            reason: `Order return: ${order.order_number}`,
          });
        }
      }

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'return_complete',
        oldValue: order.status,
        newValue: 'returned',
        note: restockItems ? 'Items restocked' : 'Items not restocked',
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Return completed', {
        orderId,
        orderNumber: order.order_number,
        restockItems,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error completing return', { error, orderId });
      throw error;
    }
  }

  /**
   * Initiate refund
   */
  async initiateRefund(
    orderId: string,
    amount: number | undefined,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      const validStatuses: OrderStatus[] = ['returned', 'canceled'];
      if (!validStatuses.includes(order.status)) {
        throw new BadRequestError(
          `Cannot initiate refund for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      const refundAmount = amount || order.total_amount;

      // Only initiate refund if payment was completed
      if (order.payment_status === 'completed' && order.payment_id) {
        await paymentService.initiateRefund(order.payment_id, refundAmount);
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'refund_pending',
          payment_status: 'refund_processing',
          refund_initiated_at: new Date(),
          refund_amount: refundAmount,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'refund_initiated',
        oldValue: order.status,
        newValue: 'refund_pending',
        note: `Refund of ₹${(refundAmount / 100).toFixed(2)} initiated`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Refund initiated', {
        orderId,
        orderNumber: order.order_number,
        refundAmount,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'refund_initiated',
          data: {
            orderId,
            orderNumber: order.order_number,
            amount: refundAmount / 100,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send refund initiation notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error initiating refund', { error, orderId });
      throw error;
    }
  }

  /**
   * Complete refund
   */
  async completeRefund(
    orderId: string,
    refundReference: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'refund_pending') {
        throw new BadRequestError(
          `Cannot complete refund for order with status ${order.status}`,
          'INVALID_STATUS'
        );
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          status: 'refunded',
          payment_status: 'refund_completed',
          refund_completed_at: new Date(),
          refund_reference: refundReference,
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'refund_completed',
        oldValue: 'refund_pending',
        newValue: 'refunded',
        note: `Refund completed. Reference: ${refundReference}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Refund completed', {
        orderId,
        orderNumber: order.order_number,
        refundReference,
        adminEmail,
      });

      // Send notification to customer
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'refund_completed',
          data: {
            orderId,
            orderNumber: order.order_number,
            amount: order.refund_amount / 100,
            reference: refundReference,
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send refund completion notification', { orderId, error });
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error completing refund', { error, orderId });
      throw error;
    }
  }

  /**
   * Log customer contact
   */
  async contactCustomer(
    orderId: string,
    method: string,
    message: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'customer_contact',
        note: `Contact via ${method}: ${message}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Customer contact logged', {
        orderId,
        orderNumber: order.order_number,
        method,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error logging customer contact', { error, orderId });
      throw error;
    }
  }

  /**
   * Update delivery instructions
   */
  async updateDeliveryInstructions(
    orderId: string,
    instructions: string,
    adminEmail: string,
    adminId?: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      await trx('orders')
        .where({ id: orderId })
        .update({
          delivery_instructions: instructions,
          delivery_instructions_updated_at: new Date(),
          updated_at: new Date(),
        });

      // Log to history
      await this.logOrderHistory({
        orderId,
        actionType: 'note',
        note: `Delivery instructions updated: ${instructions}`,
        adminId,
        adminEmail,
      }, trx);

      await trx.commit();

      logger.info('Delivery instructions updated', {
        orderId,
        orderNumber: order.order_number,
        adminEmail,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating delivery instructions', { error, orderId });
      throw error;
    }
  }

  /**
   * Get available delivery personnel
   */
  async getAvailableDeliveryPersonnel(all: boolean = false): Promise<DeliveryPerson[]> {
    const db = getDb();

    try {
      let query = db('delivery_personnel')
        .where({ is_active: true })
        .select('id', 'name', 'mobile_number', 'email');

      // Filter out those assigned to active orders (preparing, out_for_delivery) by default
      if (!all) {
        const assignedPersonnelIds = await db('orders')
          .whereIn('status', ['preparing', 'out_for_delivery'])
          .whereNotNull('delivery_personnel_id')
          .distinct('delivery_personnel_id')
          .pluck('delivery_personnel_id');

        if (assignedPersonnelIds.length > 0) {
          query = query.whereNotIn('id', assignedPersonnelIds);
        }
      }

      const personnel = await query.orderBy('name', 'asc');

      return personnel.map((person: any) => ({
        id: person.id,
        name: person.name,
        mobileNumber: person.mobile_number,
        email: person.email,
      }));
    } catch (error: any) {
      // If table doesn't exist or other DB error, return empty array
      console.error('Error fetching delivery personnel:', error.message);
      return [];
    }
  }

  /**
   * Validate status transition - Production-Ready Rules
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
      // Payment & Confirmation Flow
      pending: ['payment_processing', 'canceled'],
      payment_processing: ['confirmed', 'payment_failed', 'failed'],
      payment_failed: ['payment_processing', 'canceled'], // Allow retry
      confirmed: ['preparing', 'on_hold', 'canceled'],
      
      // Preparation & Delivery Flow
      on_hold: ['preparing', 'ready_for_pickup', 'canceled'], // Can resume to any preparation state
      preparing: ['ready_for_pickup', 'on_hold', 'canceled'],
      ready_for_pickup: ['out_for_delivery', 'on_hold', 'canceled'],
      out_for_delivery: ['delivered', 'delivery_attempted', 'on_hold', 'canceled'],
      delivery_attempted: ['out_for_delivery', 'on_hold', 'canceled', 'failed'], // Allow retry or give up
      delivered: ['return_requested'],
      
      // Return & Refund Flow
      return_requested: ['return_approved', 'return_rejected'],
      return_approved: ['return_pickup_scheduled'],
      return_rejected: [], // Terminal state
      return_pickup_scheduled: ['return_in_transit'],
      return_in_transit: ['returned'],
      returned: ['refund_pending'],
      refund_pending: ['refunded'],
      
      // Terminal States
      canceled: [], // Cannot transition from canceled
      failed: [], // Cannot transition from failed
      refunded: [], // Cannot transition from refunded
    };

    const validNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
    
    if (!validNextStatuses.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validNextStatuses.join(', ') || 'none'}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }
}

export const orderService = new OrderService();

