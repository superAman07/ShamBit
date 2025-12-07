import { apiService } from './api';
import {
  Order,
  OrderFilters,
  OrderListResponse,
  PaymentDiscrepancy,
  OrderStatusUpdate,
  OrderAssignment,
  OrderCancellation,
  OrderReturn,
  DeliveryPersonnel,
  OrderNote,
} from '@/types/order';

class OrderService {
  /**
   * Get orders with filters and pagination
   */
  async getOrders(
    page: number = 1,
    pageSize: number = 20,
    filters?: OrderFilters,
    sortBy: string = 'created_at', // Use snake_case for API
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<OrderListResponse> {
    const params: any = {
      page,
      pageSize,
      sortBy,
      sortOrder,
      ...filters,
    };

    // Convert array filters to comma-separated strings
    if (filters?.status) {
      params.status = filters.status.join(',');
    }
    if (filters?.paymentStatus) {
      params.paymentStatus = filters.paymentStatus.join(',');
    }
    if (filters?.paymentMethod) {
      params.paymentMethod = filters.paymentMethod.join(',');
    }

    // Get the raw response to access both data and pagination
    const response = await apiService.getAxiosInstance().get('/orders/admin/all', { params });
    
    return {
      orders: response.data.data,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
      totalPages: response.data.pagination.totalPages,
    };
  }

  /**
   * Get order by ID with full details including timeline
   */
  async getOrderById(orderId: string): Promise<Order> {
    return apiService.get<Order>(`/orders/admin/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(update: OrderStatusUpdate): Promise<Order> {
    return apiService.put<Order>(`/orders/admin/${update.orderId}/status`, {
      status: update.status,
      notes: update.notes,
    });
  }

  /**
   * Assign order to delivery personnel
   */
  async assignOrderToDelivery(assignment: OrderAssignment): Promise<Order> {
    return apiService.put<Order>(`/orders/admin/${assignment.orderId}/delivery`, {
      deliveryPersonId: assignment.deliveryPersonnelId,
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(cancellation: OrderCancellation): Promise<Order> {
    return apiService.put<Order>(`/orders/admin/${cancellation.orderId}/cancel`, {
      reason: cancellation.reason,
    });
  }

  /**
   * Process order return
   */
  async processOrderReturn(returnData: OrderReturn): Promise<Order> {
    return apiService.put<Order>(`/orders/admin/${returnData.orderId}/return`, {
      reason: returnData.reason,
    });
  }

  /**
   * Get available delivery personnel
   */
  async getAvailableDeliveryPersonnel(): Promise<DeliveryPersonnel[]> {
    return apiService.get<DeliveryPersonnel[]>('/orders/admin/delivery-personnel');
  }

  /**
   * Add note to order
   */
  async addOrderNote(noteData: OrderNote): Promise<Order> {
    return apiService.post<Order>(`/orders/admin/${noteData.orderId}/notes`, {
      note: noteData.note,
    });
  }

  /**
   * Get payment discrepancies
   */
  async getPaymentDiscrepancies(
    page: number = 1,
    pageSize: number = 20,
    status?: 'pending' | 'resolved' | 'ignored'
  ): Promise<{ discrepancies: PaymentDiscrepancy[]; total: number }> {
    const params: any = { page, pageSize };
    if (status) {
      params.status = status;
    }
    return apiService.get<{ discrepancies: PaymentDiscrepancy[]; total: number }>(
      '/orders/payment-discrepancies',
      params
    );
  }

  /**
   * Resolve payment discrepancy
   */
  async resolvePaymentDiscrepancy(
    discrepancyId: string,
    action: 'resolve' | 'ignore',
    notes?: string
  ): Promise<PaymentDiscrepancy> {
    return apiService.put<PaymentDiscrepancy>(`/orders/payment-discrepancies/${discrepancyId}`, {
      action,
      notes,
    });
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStatistics(startDate?: string, endDate?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    canceledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return apiService.get<any>('/orders/admin/statistics', params);
  }

  // ============================================================================
  // ENHANCED ORDER MANAGEMENT METHODS (Production-Ready)
  // ============================================================================

  /**
   * Put order on hold
   */
  async putOnHold(orderId: string, reason: string, notes?: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/hold`, {
      reason,
      notes,
    });
  }

  /**
   * Release order from hold
   */
  async releaseHold(orderId: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/release-hold`, {});
  }

  /**
   * Mark order as ready for pickup
   */
  async markReadyForPickup(orderId: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/ready-for-pickup`, {});
  }

  /**
   * Record delivery attempt (failed delivery)
   */
  async recordDeliveryAttempt(
    orderId: string,
    reason: string,
    notes?: string,
    rescheduleTime?: string
  ): Promise<void> {
    await apiService.post<void>(`/orders/admin/${orderId}/delivery-attempt`, {
      reason,
      notes,
      rescheduleTime,
    });
  }

  /**
   * Retry delivery after failed attempt
   */
  async retryDelivery(
    orderId: string,
    newDeliveryTime?: string,
    deliveryPersonnelId?: string,
    notes?: string
  ): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/retry-delivery`, {
      newDeliveryTime,
      deliveryPersonnelId,
      notes,
    });
  }

  /**
   * Update delivery instructions
   */
  async updateDeliveryInstructions(orderId: string, instructions: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/delivery-instructions`, {
      instructions,
    });
  }

  /**
   * Request return (customer-initiated)
   */
  async requestReturn(orderId: string, reason: string): Promise<void> {
    await apiService.post<void>(`/orders/${orderId}/return-request`, {
      reason,
    });
  }

  /**
   * Approve return request
   */
  async approveReturn(orderId: string, notes?: string, restockItems: boolean = true): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/return/approve`, {
      notes,
      restockItems,
    });
  }

  /**
   * Reject return request
   */
  async rejectReturn(orderId: string, reason: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/return/reject`, {
      reason,
    });
  }

  /**
   * Schedule return pickup
   */
  async scheduleReturnPickup(orderId: string, pickupTime: string, notes?: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/return/schedule-pickup`, {
      pickupTime,
      notes,
    });
  }

  /**
   * Complete return process
   */
  async completeReturn(orderId: string, restockItems: boolean = true, notes?: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/return/complete`, {
      restockItems,
      notes,
    });
  }

  /**
   * Initiate refund
   */
  async initiateRefund(orderId: string, amount?: number, reason?: string): Promise<void> {
    await apiService.post<void>(`/orders/admin/${orderId}/refund/initiate`, {
      amount,
      reason,
    });
  }

  /**
   * Complete refund
   */
  async completeRefund(orderId: string, refundReference: string, notes?: string): Promise<void> {
    await apiService.put<void>(`/orders/admin/${orderId}/refund/complete`, {
      refundReference,
      notes,
    });
  }

  /**
   * Log customer contact
   */
  async contactCustomer(
    orderId: string,
    method: 'phone' | 'sms' | 'whatsapp' | 'email',
    message: string,
    responseReceived?: boolean,
    followUpRequired?: boolean
  ): Promise<void> {
    await apiService.post<void>(`/orders/admin/${orderId}/contact-customer`, {
      method,
      message,
      responseReceived,
      followUpRequired,
    });
  }
}

export const orderService = new OrderService();