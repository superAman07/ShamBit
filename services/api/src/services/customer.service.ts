import { getDatabase } from '@shambit/database';
import { BadRequestError, NotFoundError, ConflictError } from '@shambit/shared';
import { logger } from '../config/logger.config';
import { Request } from 'express';
import {
  Customer,
  CustomerDetails,
  CustomerFilters,
  CustomerSorting,
  PaginationParams,
  PaginationMeta,
  CustomerStatistics,
  CustomerNote,
  OrderSummary,
  ActivityLogEntry,
  Address,
  VerificationStatus,
} from '../types/customer.types';
import { notificationService } from './notification.service';

// Lazy database getter to avoid initialization issues
const getDb = () => getDatabase();

/**
 * Map database row to Customer object (snake_case to camelCase)
 */
function mapCustomerFromDb(row: any): Customer {
  return {
    id: row.id,
    name: row.name || '',
    mobileNumber: row.mobile_number,
    email: row.email,
    verificationStatus: row.verification_status,
    isBlocked: row.is_blocked,
    totalOrders: parseInt(row.total_orders || '0'),
    totalSpent: parseFloat(row.total_spent || '0'),
    lastLoginAt: row.last_login_at,
    lastOrderDate: row.last_order_date,
    createdAt: row.created_at,
  };
}

/**
 * Map database row to Address object
 */
function mapAddressFromDb(row: any): Address {
  return {
    id: row.id,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  };
}

/**
 * Map database row to OrderSummary object
 */
function mapOrderSummaryFromDb(row: any): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    totalAmount: parseFloat(row.total_amount),
    status: row.status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

/**
 * Map database row to CustomerNote object
 */
function mapCustomerNoteFromDb(row: any): CustomerNote {
  return {
    id: row.id,
    noteText: row.note_text,
    adminName: row.admin_name,
    createdAt: row.created_at,
  };
}

/**
 * Map database row to ActivityLogEntry object
 */
function mapActivityLogFromDb(row: any): ActivityLogEntry {
  return {
    id: row.id,
    actionType: row.action_type,
    reason: row.reason,
    oldValue: row.old_value,
    newValue: row.new_value,
    adminName: row.admin_name,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

class CustomerService {
  /**
   * Calculate customer metrics (total orders, total spent, last order date)
   */
  private async calculateCustomerMetrics(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date | null;
  }> {
    const result = await getDb()('orders')
      .where({ user_id: customerId })
      .whereNotIn('status', ['failed', 'canceled'])
      .select(
        getDb().raw('COUNT(*) as total_orders'),
        getDb().raw('COALESCE(SUM(total_amount), 0) as total_spent'),
        getDb().raw('MAX(created_at) as last_order_date')
      )
      .first();

    return {
      totalOrders: parseInt(result?.total_orders || '0'),
      totalSpent: parseFloat(result?.total_spent || '0'),
      lastOrderDate: result?.last_order_date || null,
    };
  }

  /**
   * Get admin IP address from request
   */
  private getAdminIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(): Promise<CustomerStatistics> {
    // Get total customers
    const totalResult = await getDb()('users')
      .count('* as count')
      .first();
    const totalCustomers = parseInt(totalResult?.count as string || '0');

    // Get active customers (not blocked)
    const activeResult = await getDb()('users')
      .where({ is_blocked: false })
      .count('* as count')
      .first();
    const activeCustomers = parseInt(activeResult?.count as string || '0');

    // Get blocked customers
    const blockedResult = await getDb()('users')
      .where({ is_blocked: true })
      .count('* as count')
      .first();
    const blockedCustomers = parseInt(blockedResult?.count as string || '0');

    // Get new customers in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newResult = await getDb()('users')
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as count')
      .first();
    const newCustomersLast30Days = parseInt(newResult?.count as string || '0');

    return {
      totalCustomers,
      activeCustomers,
      blockedCustomers,
      newCustomersLast30Days,
    };
  }

  /**
   * Get paginated list of customers with search and filters
   */
  async getCustomers(
    filters: CustomerFilters,
    pagination: PaginationParams,
    sorting: CustomerSorting
  ): Promise<{ customers: Customer[]; pagination: PaginationMeta }> {
    const { page, pageSize } = pagination;
    const { sortBy, sortOrder } = sorting;
    const offset = (page - 1) * pageSize;

    // Map camelCase to snake_case for database columns
    const columnMapping: Record<string, string> = {
      name: 'users.name',
      created_at: 'users.created_at',
      last_login_at: 'users.last_login_at',
      last_order_date: 'last_order_date',
    };

    const dbSortBy = columnMapping[sortBy] || 'users.created_at';

    // Build query with LEFT JOIN to get order metrics
    const db = getDb();
    let query = db('users')
      .leftJoin('orders', function() {
        this.on('orders.user_id', '=', 'users.id')
          .andOnNotIn('orders.status', ['failed', 'canceled']);
      })
      .select(
        'users.id',
        'users.name',
        'users.mobile_number',
        'users.email',
        'users.verification_status',
        'users.is_blocked',
        'users.last_login_at',
        'users.created_at',
        db.raw("COUNT(DISTINCT CASE WHEN orders.status NOT IN ('failed', 'canceled') THEN orders.id END) as total_orders"),
        db.raw("COALESCE(SUM(CASE WHEN orders.status NOT IN ('failed', 'canceled') THEN orders.total_amount ELSE 0 END), 0) as total_spent"),
        db.raw("MAX(CASE WHEN orders.status NOT IN ('failed', 'canceled') THEN orders.created_at END) as last_order_date")
      )
      .groupBy('users.id', 'users.name', 'users.mobile_number', 'users.email', 'users.verification_status', 'users.is_blocked', 'users.last_login_at', 'users.created_at');

    // Apply search filter (case-insensitive)
    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.where(function() {
        this.whereRaw('LOWER(users.name) LIKE ?', [searchTerm])
          .orWhereRaw('users.mobile_number LIKE ?', [searchTerm]);
      });
    }

    // Apply verification status filter
    if (filters.verificationStatus) {
      query = query.where('users.verification_status', filters.verificationStatus);
    }

    // Apply account status filter
    if (filters.accountStatus) {
      const isBlocked = filters.accountStatus === 'blocked';
      query = query.where('users.is_blocked', isBlocked);
    }

    // Get total count before pagination
    const countQuery = query.clone();
    const countResult = await countQuery.countDistinct('users.id as count').first();
    const totalItems = parseInt(countResult?.count as string || '0');

    // Apply sorting and pagination
    const customers = await query
      .orderBy(dbSortBy, sortOrder)
      .limit(pageSize)
      .offset(offset);

    const mappedCustomers = customers.map(mapCustomerFromDb);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      customers: mappedCustomers,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };
  }

  /**
   * Get customer details by ID
   */
  async getCustomerById(customerId: string): Promise<CustomerDetails> {
    // Get customer basic info
    const customer = await getDb()('users')
      .where({ id: customerId })
      .first();

    if (!customer) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    // Calculate customer metrics
    const metrics = await this.calculateCustomerMetrics(customerId);

    // Get all addresses
    const addresses = await getDb()('user_addresses')
      .where({ user_id: customerId })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'desc');

    const mappedAddresses = addresses.map(mapAddressFromDb);

    // Get recent 10 orders
    const recentOrders = await getDb()('orders')
      .where({ user_id: customerId })
      .orderBy('created_at', 'desc')
      .limit(10)
      .select('id', 'order_number', 'total_amount', 'status', 'payment_method', 'created_at');

    const mappedOrders = recentOrders.map(mapOrderSummaryFromDb);

    // Get all customer notes with admin names via JOIN
    const notes = await getDb()('customer_notes')
      .leftJoin('admins', 'customer_notes.admin_id', 'admins.id')
      .where({ 'customer_notes.customer_id': customerId })
      .orderBy('customer_notes.created_at', 'desc')
      .select(
        'customer_notes.id',
        'customer_notes.note_text',
        'customer_notes.created_at',
        'admins.name as admin_name'
      );

    const mappedNotes = notes.map(mapCustomerNoteFromDb);

    // Get activity log with admin names via JOIN
    const activityLog = await getDb()('customer_activity_log')
      .leftJoin('admins', 'customer_activity_log.admin_id', 'admins.id')
      .where({ 'customer_activity_log.customer_id': customerId })
      .orderBy('customer_activity_log.created_at', 'desc')
      .select(
        'customer_activity_log.id',
        'customer_activity_log.action_type',
        'customer_activity_log.reason',
        'customer_activity_log.old_value',
        'customer_activity_log.new_value',
        'customer_activity_log.ip_address',
        'customer_activity_log.created_at',
        'admins.name as admin_name'
      );

    const mappedActivityLog = activityLog.map(mapActivityLogFromDb);

    // Build customer details object
    const customerDetails: CustomerDetails = {
      id: customer.id,
      name: customer.name || '',
      mobileNumber: customer.mobile_number,
      email: customer.email,
      verificationStatus: customer.verification_status,
      isBlocked: customer.is_blocked,
      totalOrders: metrics.totalOrders,
      totalSpent: metrics.totalSpent,
      lastLoginAt: customer.last_login_at,
      lastOrderDate: metrics.lastOrderDate || undefined,
      createdAt: customer.created_at,
      addresses: mappedAddresses,
      recentOrders: mappedOrders,
      notes: mappedNotes,
      activityLog: mappedActivityLog,
    };

    return customerDetails;
  }

  /**
   * Block a customer account
   */
  async blockCustomer(
    customerId: string,
    adminId: string,
    reason: string,
    ipAddress: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Check if customer exists
      const customer = await trx('users')
        .where({ id: customerId })
        .first();

      if (!customer) {
        throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // Prevent duplicate block operations
      if (customer.is_blocked) {
        throw new ConflictError('Customer is already blocked', 'CUSTOMER_ALREADY_BLOCKED');
      }

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new BadRequestError('Reason is required', 'REASON_REQUIRED');
      }

      // Update customer status
      await trx('users')
        .where({ id: customerId })
        .update({
          is_blocked: true,
          updated_at: trx.fn.now(),
        });

      // Log action to activity log
      await trx('customer_activity_log').insert({
        customer_id: customerId,
        admin_id: adminId,
        action_type: 'block',
        reason: reason.trim(),
        ip_address: ipAddress,
      });

      await trx.commit();

      logger.info('Customer blocked', {
        event: 'customer_blocked',
        customerId,
        adminId,
        reason,
        ipAddress,
      });

      // Send notification to customer (push + SMS)
      try {
        await notificationService.sendNotification({
          userId: customerId,
          type: 'promotional', // Using promotional as a generic type
          data: {
            title: 'Account Blocked',
            body: 'Your account has been temporarily blocked. Please contact support for assistance.',
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send block notification', {
          customerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the block operation if notification fails
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error blocking customer', { error, customerId, adminId });
      throw error;
    }
  }

  /**
   * Unblock a customer account
   */
  async unblockCustomer(
    customerId: string,
    adminId: string,
    reason: string,
    ipAddress: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Check if customer exists
      const customer = await trx('users')
        .where({ id: customerId })
        .first();

      if (!customer) {
        throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // Prevent duplicate unblock operations
      if (!customer.is_blocked) {
        throw new ConflictError('Customer is not blocked', 'CUSTOMER_NOT_BLOCKED');
      }

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new BadRequestError('Reason is required', 'REASON_REQUIRED');
      }

      // Update customer status
      await trx('users')
        .where({ id: customerId })
        .update({
          is_blocked: false,
          updated_at: trx.fn.now(),
        });

      // Log action to activity log
      await trx('customer_activity_log').insert({
        customer_id: customerId,
        admin_id: adminId,
        action_type: 'unblock',
        reason: reason.trim(),
        ip_address: ipAddress,
      });

      await trx.commit();

      logger.info('Customer unblocked', {
        event: 'customer_unblocked',
        customerId,
        adminId,
        reason,
        ipAddress,
      });

      // Send notification to customer (push + SMS)
      try {
        await notificationService.sendNotification({
          userId: customerId,
          type: 'promotional', // Using promotional as a generic type
          data: {
            title: 'Account Unblocked',
            body: 'Your account has been unblocked. You can now place orders again.',
          },
          channels: ['push', 'sms'],
        });
      } catch (error) {
        logger.error('Failed to send unblock notification', {
          customerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the unblock operation if notification fails
      }
    } catch (error) {
      await trx.rollback();
      logger.error('Error unblocking customer', { error, customerId, adminId });
      throw error;
    }
  }

  /**
   * Update customer verification status
   */
  async updateVerificationStatus(
    customerId: string,
    adminId: string,
    status: VerificationStatus,
    ipAddress: string
  ): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Check if customer exists
      const customer = await trx('users')
        .where({ id: customerId })
        .first();

      if (!customer) {
        throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // Validate status values
      const validStatuses: VerificationStatus[] = ['verified', 'not_verified', 'suspicious'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestError(
          'Invalid verification status. Must be: verified, not_verified, or suspicious',
          'INVALID_VERIFICATION_STATUS'
        );
      }

      const oldStatus = customer.verification_status;

      // Update verification status
      await trx('users')
        .where({ id: customerId })
        .update({
          verification_status: status,
          updated_at: trx.fn.now(),
        });

      // Log verification change to activity log
      await trx('customer_activity_log').insert({
        customer_id: customerId,
        admin_id: adminId,
        action_type: 'verification_change',
        old_value: oldStatus,
        new_value: status,
        ip_address: ipAddress,
      });

      await trx.commit();

      logger.info('Customer verification status updated', {
        event: 'verification_status_changed',
        customerId,
        adminId,
        oldStatus,
        newStatus: status,
        ipAddress,
      });
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating verification status', { error, customerId, adminId });
      throw error;
    }
  }

  /**
   * Add a note to customer profile
   */
  async addCustomerNote(
    customerId: string,
    adminId: string,
    noteText: string
  ): Promise<CustomerNote> {
    // Check if customer exists
    const customer = await getDb()('users')
      .where({ id: customerId })
      .first();

    if (!customer) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    // Validate note length (max 1000 characters)
    if (!noteText || noteText.trim().length === 0) {
      throw new BadRequestError('Note text is required', 'NOTE_TEXT_REQUIRED');
    }

    if (noteText.trim().length > 1000) {
      throw new BadRequestError(
        'Note must not exceed 1000 characters',
        'NOTE_TOO_LONG'
      );
    }

    // Insert note
    const [insertedNote] = await getDb()('customer_notes')
      .insert({
        customer_id: customerId,
        admin_id: adminId,
        note_text: noteText.trim(),
      })
      .returning('*');

    // Get admin name via JOIN
    const noteWithAdmin = await getDb()('customer_notes')
      .leftJoin('admins', 'customer_notes.admin_id', 'admins.id')
      .where({ 'customer_notes.id': insertedNote.id })
      .select(
        'customer_notes.id',
        'customer_notes.note_text',
        'customer_notes.created_at',
        'admins.name as admin_name'
      )
      .first();

    logger.info('Customer note added', {
      event: 'customer_note_added',
      customerId,
      adminId,
      noteId: insertedNote.id,
    });

    return mapCustomerNoteFromDb(noteWithAdmin);
  }

  /**
   * Get customer order history with pagination and date filter
   */
  async getCustomerOrders(
    customerId: string,
    pagination: PaginationParams,
    dateFilter?: { startDate?: Date; endDate?: Date }
  ): Promise<{ orders: OrderSummary[]; pagination: PaginationMeta }> {
    // Check if customer exists
    const customer = await getDb()('users')
      .where({ id: customerId })
      .first();

    if (!customer) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    // Build query
    let query = getDb()('orders')
      .where({ user_id: customerId })
      .select('id', 'order_number', 'total_amount', 'status', 'payment_method', 'created_at');

    // Apply date range filter
    if (dateFilter?.startDate) {
      query = query.where('created_at', '>=', dateFilter.startDate);
    }

    if (dateFilter?.endDate) {
      query = query.where('created_at', '<=', dateFilter.endDate);
    }

    // Get total count
    const countQuery = query.clone();
    const countResult = await countQuery.count('* as count').first();
    const totalItems = parseInt(countResult?.count as string || '0');

    // Apply sorting and pagination
    const orders = await query
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    const mappedOrders = orders.map(mapOrderSummaryFromDb);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      orders: mappedOrders,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };
  }

}

export const customerService = new CustomerService();
