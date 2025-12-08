import { getDatabase } from '@shambit/database';
import { BadRequestError, NotFoundError } from '@shambit/shared';
import {
  DeliveryPersonnel,
  CreateDeliveryPersonnelDto,
  UpdateDeliveryPersonnelDto,
  UpdateLocationDto,
  Delivery,
  CreateDeliveryDto,
  UpdateDeliveryStatusDto,
  AssignDeliveryDto,
  DeliveryPersonnelWithStats,
  DeliveryAssignmentSuggestion,
  DeliveryMetrics,
  DeliveryListQuery,
  DeliveryStatus,
} from '../types/delivery.types';
import { mapsService } from './maps.service';
import { notificationService } from './notification.service';
import { logger } from '../config/logger.config';

// Lazy database getter to avoid initialization issues
const getDb = () => getDatabase();

function mapDeliveryPersonnelFromDb(row: any): DeliveryPersonnel {
  return {
    id: row.id,
    name: row.name,
    mobileNumber: row.mobile_number,
    email: row.email,
    vehicleType: row.vehicle_type,
    vehicleNumber: row.vehicle_number,
    isActive: row.is_active,
    isAvailable: row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeliveryFromDb(row: any): Delivery {
  return {
    id: row.id,
    orderId: row.order_id,
    deliveryPersonnelId: row.delivery_personnel_id,
    status: row.status,
    pickupLocation: row.pickup_location,
    deliveryLocation: row.delivery_location,
    assignedAt: row.assigned_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class DeliveryService {
  async createDeliveryPersonnel(
    personnelData: CreateDeliveryPersonnelDto,
    adminId: string
  ): Promise<DeliveryPersonnel> {
    try {
      const insertData: any = {
        name: personnelData.name,
        mobile_number: personnelData.mobileNumber,
        email: personnelData.email,
        vehicle_type: personnelData.vehicleType,
        vehicle_number: personnelData.vehicleNumber,
        is_active: personnelData.isActive ?? true,
        is_available: personnelData.isAvailable ?? true,
      };

      // Hash password if provided
      if (personnelData.password) {
        const bcrypt = require('bcrypt');
        insertData.password_hash = await bcrypt.hash(personnelData.password, 10);
      }

      const [personnel] = await getDb()('delivery_personnel')
        .insert(insertData)
        .returning('*');

      logger.info('Delivery personnel created', {
        event: 'delivery_personnel_created',
        personnelId: personnel.id,
        name: personnelData.name,
        mobileNumber: personnelData.mobileNumber,
        vehicleType: personnelData.vehicleType,
        hasPassword: !!personnelData.password,
        adminId,
      });

      return mapDeliveryPersonnelFromDb(personnel);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestError('Mobile number already exists', 'DUPLICATE_MOBILE');
      }
      logger.error('Error creating delivery personnel', { error, personnelData });
      throw error;
    }
  }

  async getDeliveryPersonnelById(personnelId: string): Promise<DeliveryPersonnel> {
    const personnel = await getDb()('delivery_personnel')
      .where({ id: personnelId })
      .first();

    if (!personnel) {
      throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
    }

    return mapDeliveryPersonnelFromDb(personnel);
  }

  async getAllDeliveryPersonnel(
    filters: {
      isActive?: boolean;
      isAvailable?: boolean;
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ personnel: DeliveryPersonnel[]; total: number }> {
    const offset = (page - 1) * pageSize;

    let baseQuery = getDb()('delivery_personnel');

    if (filters.isActive !== undefined) {
      baseQuery = baseQuery.where({ is_active: filters.isActive });
    }

    if (filters.isAvailable !== undefined) {
      baseQuery = baseQuery.where({ is_available: filters.isAvailable });
    }

    // Get the data with ordering
    const personnel = await baseQuery.clone()
      .orderBy('name', 'asc')
      .limit(pageSize)
      .offset(offset);

    // Get the count without ordering
    const [{ count }] = await baseQuery.clone().count('* as count');

    return {
      personnel: personnel.map(mapDeliveryPersonnelFromDb),
      total: parseInt(count as string),
    };
  }

  async updateDeliveryPersonnel(
    personnelId: string,
    updateData: UpdateDeliveryPersonnelDto,
    adminId: string
  ): Promise<DeliveryPersonnel> {
    const personnel = await getDb()('delivery_personnel')
      .where({ id: personnelId })
      .first();

    if (!personnel) {
      throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
    }

    const updateFields: any = {
      updated_at: new Date(),
    };

    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.mobileNumber !== undefined) updateFields.mobile_number = updateData.mobileNumber;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.vehicleType !== undefined) updateFields.vehicle_type = updateData.vehicleType;
    if (updateData.vehicleNumber !== undefined) updateFields.vehicle_number = updateData.vehicleNumber;
    if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
    if (updateData.isAvailable !== undefined) updateFields.is_available = updateData.isAvailable;

    const [updatedPersonnel] = await getDb()('delivery_personnel')
      .where({ id: personnelId })
      .update(updateFields)
      .returning('*');

    logger.info('Delivery personnel updated', {
      event: 'delivery_personnel_updated',
      personnelId,
      personnelName: updatedPersonnel.name,
      changes: Object.keys(updateFields).filter(key => key !== 'updated_at'),
      adminId,
    });

    return mapDeliveryPersonnelFromDb(updatedPersonnel);
  }

  async deleteDeliveryPersonnel(personnelId: string, adminId: string): Promise<void> {
    const personnel = await getDb()('delivery_personnel')
      .where({ id: personnelId })
      .first();

    if (!personnel) {
      throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
    }

    const activeDeliveries = await getDb()('deliveries')
      .where({ delivery_personnel_id: personnelId })
      .whereIn('status', ['pending', 'assigned', 'out_for_delivery'])
      .count('* as count')
      .first();

    if (parseInt(activeDeliveries?.count as string || '0') > 0) {
      throw new BadRequestError(
        'Cannot delete personnel with active deliveries',
        'HAS_ACTIVE_DELIVERIES'
      );
    }

    await getDb()('delivery_personnel').where({ id: personnelId }).delete();

    logger.info('Delivery personnel deleted', {
      event: 'delivery_personnel_deleted',
      personnelId,
      personnelName: personnel.name,
      adminId,
    });
  }

  // Location tracking removed - not needed for simplified delivery model

  async getDeliveryPersonnelWithStats(personnelId: string): Promise<DeliveryPersonnelWithStats> {
    try {
      logger.info('Getting personnel stats', { personnelId });
      
      const personnel = await this.getDeliveryPersonnelById(personnelId);
      logger.info('Found personnel', { personnelId, name: personnel.name });

      const [{ count: activeCount }] = await getDb()('deliveries')
        .where({ delivery_personnel_id: personnelId })
        .whereIn('status', ['pending', 'assigned', 'out_for_delivery'])
        .count('* as count');

      const [{ count: completedCount }] = await getDb()('deliveries')
        .where({ delivery_personnel_id: personnelId, status: 'delivered' })
        .count('* as count');

      const avgResult = await getDb()('deliveries')
        .where({ delivery_personnel_id: personnelId, status: 'delivered' })
        .whereNotNull('assigned_at')
        .whereNotNull('delivered_at')
        .select(
          getDb().raw(
            'AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60) as avg_minutes'
          )
        )
        .first();

      logger.info('Calculated stats', { 
        personnelId, 
        activeCount: parseInt(activeCount as string), 
        completedCount: parseInt(completedCount as string),
        avgMinutes: avgResult?.avg_minutes 
      });

      return {
        ...personnel,
        activeDeliveries: parseInt(activeCount as string),
        completedDeliveries: parseInt(completedCount as string),
        averageDeliveryTime: avgResult?.avg_minutes ? parseFloat(avgResult.avg_minutes) : undefined,
      };
    } catch (error) {
      logger.error('Error getting personnel stats', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, personnelId });
      throw error;
    }
  }

  async getDeliveryMetrics(personnelId: string): Promise<DeliveryMetrics> {
    const personnel = await this.getDeliveryPersonnelById(personnelId);

    const metrics = await getDb()('deliveries')
      .where({ delivery_personnel_id: personnelId })
      .select(
        getDb().raw('COUNT(*) as total_deliveries'),
        getDb().raw("COUNT(*) FILTER (WHERE status = 'delivered') as completed_deliveries"),
        getDb().raw(
          "AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60) FILTER (WHERE status = 'delivered' AND assigned_at IS NOT NULL AND delivered_at IS NOT NULL) as avg_minutes"
        )
      )
      .first();

    return {
      personnelId,
      name: personnel.name,
      totalDeliveries: parseInt(metrics?.total_deliveries || '0'),
      completedDeliveries: parseInt(metrics?.completed_deliveries || '0'),
      failedDeliveries: 0, // Removed in simplified model
      averageDeliveryTime: metrics?.avg_minutes ? parseFloat(metrics.avg_minutes) : 0,
      onTimeDeliveryRate: 0, // Removed in simplified model
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getAssignmentSuggestions(
    pickupLatitude: number,
    pickupLongitude: number,
    limit: number = 5
  ): Promise<DeliveryAssignmentSuggestion[]> {
    const personnel = await getDb()('delivery_personnel')
      .where({ is_active: true, is_available: true })
      .whereNotNull('current_latitude')
      .whereNotNull('current_longitude');

    const suggestions: DeliveryAssignmentSuggestion[] = [];

    for (const person of personnel) {
      const distance = this.calculateDistance(
        pickupLatitude,
        pickupLongitude,
        parseFloat(person.current_latitude),
        parseFloat(person.current_longitude)
      );

      const [{ count }] = await getDb()('deliveries')
        .where({ delivery_personnel_id: person.id })
        .whereIn('status', ['pending', 'assigned', 'out_for_delivery'])
        .count('* as count');

      const activeDeliveries = parseInt(count as string);
      const estimatedArrivalTime = (distance / 30) * 60;
      const score = Math.max(0, 100 - distance * 10 - activeDeliveries * 20);

      suggestions.push({
        personnelId: person.id,
        name: person.name,
        distanceKm: Math.round(distance * 100) / 100,
        activeDeliveries,
        estimatedArrivalTime: Math.round(estimatedArrivalTime),
        score: Math.round(score * 100) / 100,
      });
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async createDelivery(
    deliveryData: CreateDeliveryDto,
    adminId: string
  ): Promise<Delivery> {
    const trx = await getDb().transaction();

    try {
      const order = await trx('orders').where({ id: deliveryData.orderId }).first();

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }

      if (!['confirmed', 'preparing'].includes(order.status)) {
        throw new BadRequestError(
          `Order must be in confirmed or preparing status. Current: ${order.status}`,
          'INVALID_ORDER_STATUS'
        );
      }

      const existingDelivery = await trx('deliveries')
        .where({ order_id: deliveryData.orderId })
        .first();

      if (existingDelivery) {
        throw new BadRequestError('Delivery already exists for this order', 'DELIVERY_EXISTS');
      }

      const personnel = await trx('delivery_personnel')
        .where({ id: deliveryData.deliveryPersonnelId })
        .first();

      if (!personnel) {
        throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
      }

      if (!personnel.is_active || !personnel.is_available) {
        throw new BadRequestError('Delivery personnel is not active or available', 'PERSONNEL_UNAVAILABLE');
      }

      const [delivery] = await trx('deliveries')
        .insert({
          order_id: deliveryData.orderId,
          delivery_personnel_id: deliveryData.deliveryPersonnelId,
          status: 'assigned',
          pickup_location: JSON.stringify(deliveryData.pickupLocation),
          delivery_location: JSON.stringify(deliveryData.deliveryLocation),
          assigned_at: new Date(),
        })
        .returning('*');

      await trx('orders')
        .where({ id: deliveryData.orderId })
        .update({
          status: 'out_for_delivery',
          delivery_personnel_id: deliveryData.deliveryPersonnelId,
          updated_at: new Date(),
        });

      await trx.commit();

      logger.info('Delivery created', {
        event: 'delivery_assigned',
        deliveryId: delivery.id,
        orderId: deliveryData.orderId,
        orderNumber: order.order_number,
        personnelId: deliveryData.deliveryPersonnelId,
        personnelName: personnel.name,
        adminId,
        userId: order.user_id,
      });

      // Send delivery assigned and out for delivery notifications (push + SMS)
      try {
        await notificationService.sendNotification({
          userId: order.user_id,
          type: 'delivery_assigned',
          data: {
            orderId: order.id,
            orderNumber: order.order_number,
            deliveryPersonName: personnel.name,
          },
          channels: ['push', 'sms'],
        });

        await notificationService.sendOrderStatusNotification(
          order.user_id,
          order.id,
          order.order_number,
          'out_for_delivery'
        );
      } catch (error) {
        logger.error('Failed to send delivery notification', {
          deliveryId: delivery.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the delivery creation if notification fails
      }

      return mapDeliveryFromDb(delivery);
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating delivery', { error, deliveryData });
      throw error;
    }
  }

  async assignDelivery(
    assignData: AssignDeliveryDto,
    adminId: string
  ): Promise<Delivery> {
    const order = await getDb()('orders').where({ id: assignData.orderId }).first();

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    const deliveryAddress = order.delivery_address;

    const pickupLocation = {
      latitude: 0,
      longitude: 0,
      address: 'Warehouse/Store Location',
    };

    const deliveryLocation = {
      latitude: deliveryAddress.latitude || 0,
      longitude: deliveryAddress.longitude || 0,
      address: `${deliveryAddress.address_line1}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.pincode}`,
    };

    return this.createDelivery(
      {
        orderId: assignData.orderId,
        deliveryPersonnelId: assignData.deliveryPersonnelId,
        pickupLocation,
        deliveryLocation,
      },
      adminId
    );
  }

  async getDeliveryById(deliveryId: string): Promise<Delivery> {
    const delivery = await getDb()('deliveries').where({ id: deliveryId }).first();

    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'DELIVERY_NOT_FOUND');
    }

    return mapDeliveryFromDb(delivery);
  }

  async getDeliveryByOrderId(orderId: string): Promise<Delivery> {
    const delivery = await getDb()('deliveries').where({ order_id: orderId }).first();

    if (!delivery) {
      throw new NotFoundError('Delivery not found for this order', 'DELIVERY_NOT_FOUND');
    }

    return mapDeliveryFromDb(delivery);
  }

  async getAllDeliveries(
    query: DeliveryListQuery = {}
  ): Promise<{ deliveries: Delivery[]; total: number }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let dbQuery = getDb()('deliveries').orderBy('created_at', 'desc');

    if (query.status) {
      dbQuery = dbQuery.where({ status: query.status });
    }

    if (query.deliveryPersonnelId) {
      dbQuery = dbQuery.where({ delivery_personnel_id: query.deliveryPersonnelId });
    }

    if (query.startDate) {
      dbQuery = dbQuery.where('created_at', '>=', query.startDate);
    }

    if (query.endDate) {
      dbQuery = dbQuery.where('created_at', '<=', query.endDate);
    }

    const deliveries = await dbQuery.clone().limit(pageSize).offset(offset);
    const [{ count }] = await dbQuery.clone().count('* as count');

    return {
      deliveries: deliveries.map(mapDeliveryFromDb),
      total: parseInt(count as string),
    };
  }

  async getActiveDeliveries(): Promise<Delivery[]> {
    const deliveries = await getDb()('deliveries')
      .whereIn('status', ['pending', 'assigned', 'out_for_delivery'])
      .orderBy('assigned_at', 'asc');

    return deliveries.map(mapDeliveryFromDb);
  }

  async updateDeliveryStatus(
    deliveryId: string,
    statusData: UpdateDeliveryStatusDto,
    userId: string,
    userType: 'admin' | 'delivery'
  ): Promise<Delivery> {
    const trx = await getDb().transaction();

    try {
      const delivery = await trx('deliveries').where({ id: deliveryId }).first();

      if (!delivery) {
        throw new NotFoundError('Delivery not found', 'DELIVERY_NOT_FOUND');
      }

      if (userType === 'delivery' && delivery.delivery_personnel_id !== userId) {
        throw new BadRequestError(
          'You can only update deliveries assigned to you',
          'UNAUTHORIZED_DELIVERY_UPDATE'
        );
      }

      const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
        pending: ['assigned'],
        assigned: ['out_for_delivery'],
        out_for_delivery: ['delivered'],
        delivered: [],
      };

      if (!validTransitions[delivery.status as DeliveryStatus]?.includes(statusData.status)) {
        throw new BadRequestError(
          `Invalid status transition from ${delivery.status} to ${statusData.status}`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      const updateData: any = {
        status: statusData.status,
        updated_at: new Date(),
      };

      if (statusData.status === 'delivered') {
        updateData.delivered_at = new Date();
      }

      const [updatedDelivery] = await trx('deliveries')
        .where({ id: deliveryId })
        .update(updateData)
        .returning('*');

      let orderStatus: string | undefined;
      if (statusData.status === 'delivered') {
        orderStatus = 'delivered';
        await trx('orders')
          .where({ id: delivery.order_id })
          .update({
            status: orderStatus,
            delivered_at: new Date(),
            updated_at: new Date(),
          });
      }

      await trx.commit();

      logger.info('Delivery status updated', {
        event: 'delivery_status_changed',
        deliveryId,
        orderId: delivery.order_id,
        oldStatus: delivery.status,
        newStatus: statusData.status,
        userId,
        userType,
        personnelId: delivery.delivery_personnel_id,
      });

      return mapDeliveryFromDb(updatedDelivery);
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating delivery status', { error, deliveryId });
      throw error;
    }
  }

  async trackDelivery(orderId: string): Promise<{
    delivery: Delivery;
  }> {
    const delivery = await this.getDeliveryByOrderId(orderId);

    return {
      delivery,
    };
  }

  async reassignDelivery(
    deliveryId: string,
    newPersonnelId: string,
    adminId: string
  ): Promise<Delivery> {
    const trx = await getDb().transaction();

    try {
      const delivery = await trx('deliveries').where({ id: deliveryId }).first();

      if (!delivery) {
        throw new NotFoundError('Delivery not found', 'DELIVERY_NOT_FOUND');
      }

      if (delivery.status === 'delivered') {
        throw new BadRequestError('Cannot reassign completed delivery', 'DELIVERY_COMPLETED');
      }

      const personnel = await trx('delivery_personnel')
        .where({ id: newPersonnelId })
        .first();

      if (!personnel) {
        throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
      }

      if (!personnel.is_active || !personnel.is_available) {
        throw new BadRequestError(
          'Delivery personnel is not active or available',
          'PERSONNEL_UNAVAILABLE'
        );
      }

      const [updatedDelivery] = await trx('deliveries')
        .where({ id: deliveryId })
        .update({
          delivery_personnel_id: newPersonnelId,
          updated_at: new Date(),
        })
        .returning('*');

      await trx('orders')
        .where({ id: delivery.order_id })
        .update({
          delivery_personnel_id: newPersonnelId,
          updated_at: new Date(),
        });

      await trx.commit();

      logger.info('Delivery reassigned', {
        event: 'delivery_reassigned',
        deliveryId,
        orderId: delivery.order_id,
        oldPersonnelId: delivery.delivery_personnel_id,
        newPersonnelId,
        newPersonnelName: personnel.name,
        adminId,
      });

      return mapDeliveryFromDb(updatedDelivery);
    } catch (error) {
      await trx.rollback();
      logger.error('Error reassigning delivery', { error, deliveryId });
      throw error;
    }
  }

  // ETA calculation removed - simplified delivery model doesn't track real-time location

  /**
   * Get delivery status overview for dashboard
   * Maps order statuses to delivery stages for dashboard display
   */
  async getDeliveryStatusOverview() {
    const db = getDb();

    try {
      // Get order counts by status from orders table
      // Map order statuses to delivery stages:
      // - assigned: orders that are 'preparing' or 'ready_for_pickup' (assigned to delivery but not picked up)
      // - picked_up: orders that are 'out_for_delivery' (picked up and in transit)
      // - in_transit: same as picked_up (out_for_delivery)
      // - delivered: orders that are 'delivered'
      // - failed: orders that are 'delivery_attempted' or 'failed'

      const [assignedResult, pickedUpResult, deliveredResult, failedResult] = await Promise.all([
        // Assigned: preparing or ready for pickup
        db('orders')
          .whereIn('status', ['preparing', 'ready_for_pickup'])
          .count('* as count')
          .first(),
        
        // Picked Up / In Transit: out for delivery
        db('orders')
          .where('status', 'out_for_delivery')
          .count('* as count')
          .first(),
        
        // Delivered
        db('orders')
          .where('status', 'delivered')
          .whereRaw('DATE(delivered_at) = CURRENT_DATE') // Only today's deliveries
          .count('* as count')
          .first(),
        
        // Failed: delivery attempted or failed
        db('orders')
          .whereIn('status', ['delivery_attempted', 'failed'])
          .count('* as count')
          .first(),
      ]);

      const assigned = parseInt(assignedResult?.count as string) || 0;
      const pickedUp = parseInt(pickedUpResult?.count as string) || 0;
      const delivered = parseInt(deliveredResult?.count as string) || 0;
      const failed = parseInt(failedResult?.count as string) || 0;

      // Format the response to match frontend expectations
      const overview = {
        assigned,
        picked_up: pickedUp,
        in_transit: pickedUp, // Same as picked_up (out_for_delivery)
        delivered,
        failed,
      };

      logger.info('Delivery status overview fetched', overview);

      return overview;
    } catch (error) {
      logger.error('Error getting delivery status overview', { error });
      throw error;
    }
  }

  /**
   * Get delivery personnel by mobile number
   */
  async getDeliveryPersonnelByMobile(mobileNumber: string): Promise<DeliveryPersonnel | null> {
    try {
      const personnel = await getDb()('delivery_personnel')
        .where({ mobile_number: mobileNumber })
        .first();

      if (!personnel) {
        return null;
      }

      return mapDeliveryPersonnelFromDb(personnel);
    } catch (error) {
      logger.error('Error getting delivery personnel by mobile', { error, mobileNumber });
      throw error;
    }
  }

  /**
   * Get delivery personnel by mobile number for authentication (includes password hash)
   */
  async getDeliveryPersonnelForAuth(mobileNumber: string): Promise<(DeliveryPersonnel & { passwordHash?: string }) | null> {
    try {
      const personnel = await getDb()('delivery_personnel')
        .where({ mobile_number: mobileNumber })
        .first();

      if (!personnel) {
        return null;
      }

      const mappedPersonnel = mapDeliveryPersonnelFromDb(personnel);
      return {
        ...mappedPersonnel,
        passwordHash: personnel.password_hash
      };
    } catch (error) {
      logger.error('Error getting delivery personnel for auth', { error, mobileNumber });
      throw error;
    }
  }

  /**
   * Get deliveries assigned to a specific delivery personnel
   */
  async getDeliveriesByPersonnel(
    personnelId: string,
    status?: string
  ): Promise<Delivery[]> {
    try {
      logger.info('Getting deliveries for personnel', { personnelId, status });
      
      let query = getDb()('deliveries')
        .where({ delivery_personnel_id: personnelId });

      if (status) {
        query = query.where({ status });
      } else {
        // By default, return only active deliveries
        query = query.whereIn('status', ['pending', 'assigned', 'out_for_delivery']);
      }

      const deliveries = await query.orderBy('created_at', 'desc');
      
      logger.info('Found deliveries', { count: deliveries.length, personnelId });

      if (!deliveries || deliveries.length === 0) {
        return [];
      }

      return deliveries.map(mapDeliveryFromDb);
    } catch (error) {
      logger.error('Error getting deliveries by personnel', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, personnelId });
      throw error;
    }
  }

  /**
   * Get delivery history for a specific delivery personnel
   */
  async getDeliveryHistory(
    personnelId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ deliveries: Delivery[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;

      const [deliveries, countResult] = await Promise.all([
        getDb()('deliveries')
          .where({ delivery_personnel_id: personnelId })
          .where('status', 'delivered')
          .orderBy('delivered_at', 'desc')
          .limit(pageSize)
          .offset(offset),
        getDb()('deliveries')
          .where({ delivery_personnel_id: personnelId })
          .where('status', 'delivered')
          .count('* as count')
          .first(),
      ]);

      return {
        deliveries: deliveries.map(mapDeliveryFromDb),
        total: parseInt(countResult?.count as string) || 0,
      };
    } catch (error) {
      logger.error('Error getting delivery history', { error, personnelId });
      throw error;
    }
  }

  /**
   * Reset delivery personnel password
   */
  async resetDeliveryPersonnelPassword(
    personnelId: string,
    newPassword: string,
    adminId: string
  ): Promise<void> {
    try {
      const personnel = await getDb()('delivery_personnel')
        .where({ id: personnelId })
        .first();

      if (!personnel) {
        throw new NotFoundError('Delivery personnel not found', 'PERSONNEL_NOT_FOUND');
      }

      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      await getDb()('delivery_personnel')
        .where({ id: personnelId })
        .update({
          password_hash: hashedPassword,
          updated_at: new Date(),
        });

      logger.info('Delivery personnel password reset', {
        personnelId,
        personnelName: personnel.name,
        adminId,
      });
    } catch (error) {
      logger.error('Error resetting delivery personnel password', { error, personnelId });
      throw error;
    }
  }
}

export const deliveryService = new DeliveryService();

