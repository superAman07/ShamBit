import crypto from 'crypto';
import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';

const logger = createLogger('inventory-service');

// Lazy-load database connections
const getDb = () => getDatabase();
import {
  Inventory,
  InventoryHistory,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  LowStockAlert,
  InventoryListQuery,
  InventoryListResponse,
  InventoryAggregation,
} from '../types/inventory.types';

export class InventoryService {
  /**
   * Get all inventory items with pagination and filters
   */
  async getAllInventory(query: InventoryListQuery): Promise<InventoryListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        productId,
        stockLevel,
        search,
      } = query;

      const offset = (page - 1) * pageSize;

      let queryBuilder = getDb()('inventory')
        .join('products', 'inventory.product_id', 'products.id')
        .leftJoin('categories', 'products.category_id', 'categories.id');

      // Apply filters
      if (productId) {
        queryBuilder = queryBuilder.where('inventory.product_id', productId);
      }

      if (stockLevel) {
        queryBuilder = queryBuilder.where('inventory.stock_level', stockLevel);
      }

      if (search) {
        queryBuilder = queryBuilder.where(function() {
          this.where('products.name', 'ilike', `%${search}%`)
            .orWhere('products.sku', 'ilike', `%${search}%`);
        });
      }

      // Get total count
      const totalQuery = queryBuilder.clone();
      const [{ count }] = await totalQuery.count('inventory.id as count');
      const totalItems = parseInt(count as string);

      // Get paginated results
      const inventory = await queryBuilder
        .select(
          'inventory.*',
          'products.id as product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'products.unit_size as product_unit_size',
          'products.image_urls as product_image_urls',
          'categories.id as category_id',
          'categories.name as category_name'
        )
        .orderBy('products.name', 'asc')
        .limit(pageSize)
        .offset(offset);

      const result = {
        inventory: inventory.map((item: any) => this.mapToInventory(item)),
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          totalItems,
        },
      };

      return result;
    } catch (error) {
      logger.error('Error getting all inventory', { error });
      throw new AppError('Failed to get inventory list', 500, 'INVENTORY_LIST_ERROR');
    }
  }

  /**
   * Get inventory for a specific product
   */
  async getInventory(productId: string): Promise<Inventory | null> {
    try {
      const inventory = await getDb()('inventory')
        .join('products', 'inventory.product_id', 'products.id')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .where('inventory.product_id', productId)
        .select(
          'inventory.*',
          'products.name as product_name',
          'products.sku as product_sku',
          'products.unit_size as product_unit_size',
          'products.image_urls as product_image_urls',
          'categories.id as category_id',
          'categories.name as category_name'
        )
        .first();

      if (!inventory) {
        return null;
      }

      const result = this.mapToInventory(inventory);
      return result;
    } catch (error) {
      logger.error('Error getting inventory', { error, productId });
      throw new AppError('Failed to get inventory', 500, 'INVENTORY_GET_ERROR');
    }
  }

  /**
   * Get aggregated inventory for a product (now returns same as getInventory since no warehouses)
   */
  async getAggregatedInventory(productId: string): Promise<InventoryAggregation | null> {
    try {
      const inventory = await this.getInventory(productId);

      if (!inventory) {
        return null;
      }

      const aggregation: InventoryAggregation = {
        productId,
        totalStock: inventory.totalStock,
        availableStock: inventory.availableStock,
        reservedStock: inventory.reservedStock,
      };

      return aggregation;
    } catch (error) {
      logger.error('Error getting aggregated inventory', { error, productId });
      throw new AppError('Failed to get aggregated inventory', 500, 'INVENTORY_AGGREGATION_ERROR');
    }
  }

  /**
   * Create inventory for a product
   */
  async createInventory(
    data: CreateInventoryRequest,
    performedBy?: string
  ): Promise<Inventory> {
    try {
      // Check if inventory already exists for this product
      const existing = await this.getInventory(data.productId);
      if (existing) {
        throw new AppError('Inventory already exists for this product', 409, 'INVENTORY_EXISTS');
      }

      // Verify product exists
      const product = await getDb()('products')
        .where({ id: data.productId })
        .first();

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      const trx = await getDb().transaction();

      try {
        const thresholdStock = data.thresholdStock || 10;
        const stockLevel = data.totalStock === 0 ? 'Out' : (data.totalStock <= thresholdStock ? 'Low' : 'Normal');

        // Create inventory
        const [inventory] = await trx('inventory')
          .insert({
            product_id: data.productId,
            total_stock: data.totalStock,
            available_stock: data.totalStock,
            reserved_stock: 0,
            threshold_stock: thresholdStock,
            stock_level: stockLevel,
            last_restocked_at: trx.fn.now(),
            status: 'Active',
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .returning('*');

        // Record history
        await trx('inventory_history').insert({
          product_id: data.productId,
          change_type: 'restock',
          quantity_change: data.totalStock,
          previous_stock: 0,
          new_stock: data.totalStock,
          performed_by: performedBy,
          reason: 'Initial stock',
          created_at: trx.fn.now(),
        });

        await trx.commit();

        const result = this.mapToInventory(inventory);

        // Invalidate cache
        await this.invalidateCache(data.productId);

        logger.info('Inventory created', {
          event: 'inventory_created',
          productId: data.productId,
          totalStock: data.totalStock,
          thresholdStock: thresholdStock,
          performedBy: performedBy,
        });

        return result;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating inventory', { error });
      throw new AppError('Failed to create inventory', 500, 'INVENTORY_CREATE_ERROR');
    }
  }

  /**
   * Update inventory for a product
   */
  async updateInventory(
    productId: string,
    data: UpdateInventoryRequest,
    performedBy?: string
  ): Promise<Inventory> {
    try {
      const existing = await this.getInventory(productId);
      if (!existing) {
        throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
      }

      const trx = await getDb().transaction();

      try {
        const updates: any = {
          updated_at: trx.fn.now(),
        };

        let changeType: 'restock' | 'adjustment' = 'adjustment';
        let quantityChange = 0;
        let newTotalStock = existing.totalStock;

        if (data.totalStock !== undefined) {
          quantityChange = data.totalStock - existing.totalStock;
          newTotalStock = data.totalStock;
          const newAvailableStock = existing.availableStock + quantityChange;

          updates.total_stock = data.totalStock;
          updates.available_stock = Math.max(0, newAvailableStock);
          const threshold = data.thresholdStock || existing.thresholdStock;
          updates.stock_level = newAvailableStock === 0 ? 'Out' : (newAvailableStock <= threshold ? 'Low' : 'Normal');

          if (quantityChange > 0) {
            changeType = 'restock';
            updates.last_restocked_at = trx.fn.now();
          }
        }

        if (data.thresholdStock !== undefined) {
          updates.threshold_stock = data.thresholdStock;
          updates.stock_level = existing.availableStock === 0 ? 'Out' : (existing.availableStock <= data.thresholdStock ? 'Low' : 'Normal');
        }

        if (data.status !== undefined) {
          updates.status = data.status;
        }

        // Update inventory
        await trx('inventory')
          .where('product_id', productId)
          .update(updates);

        // Record history if stock changed
        if (data.totalStock !== undefined) {
          await trx('inventory_history').insert({
            product_id: productId,
            change_type: changeType,
            quantity_change: quantityChange,
            previous_stock: existing.totalStock,
            new_stock: newTotalStock,
            performed_by: performedBy,
            reason: data.reason || 'Stock adjustment',
            created_at: trx.fn.now(),
          });
        }

        await trx.commit();

        // Invalidate cache
        await this.invalidateCache(productId);

        logger.info('Inventory updated', {
          event: 'inventory_updated',
          productId,
          changes: Object.keys(data),
          previousStock: existing.totalStock,
          newStock: data.totalStock !== undefined ? data.totalStock : existing.totalStock,
          performedBy: performedBy,
          reason: data.reason,
        });

        // Return updated inventory
        const updated = await this.getInventory(productId);
        return updated as Inventory;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating inventory', { error });
      throw new AppError('Failed to update inventory', 500, 'INVENTORY_UPDATE_ERROR');
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(limit: number = 50): Promise<LowStockAlert[]> {
    try {
      const lowStockItems = await getDb()('inventory')
        .join('products', 'inventory.product_id', 'products.id')
        .where('inventory.stock_level', 'Low')
        .where('products.is_active', true)
        .select(
          'products.id as product_id',
          'products.name as product_name',
          'inventory.available_stock as current_stock',
          'inventory.threshold_stock as threshold'
        )
        .orderBy('inventory.available_stock', 'asc')
        .limit(limit);

      const result = lowStockItems.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        currentStock: item.current_stock,
        threshold: item.threshold,
      }));

      return result;
    } catch (error) {
      logger.error('Error getting low stock products', { error });
      throw new AppError('Failed to get low stock products', 500, 'LOW_STOCK_GET_ERROR');
    }
  }

  /**
   * Get inventory history for a product
   */
  async getInventoryHistory(
    productId: string,
    limit: number = 50
  ): Promise<InventoryHistory[]> {
    try {
      const history = await getDb()('inventory_history')
        .where({ product_id: productId })
        .orderBy('created_at', 'desc')
        .limit(limit);

      return history.map(this.mapToInventoryHistory);
    } catch (error) {
      logger.error('Error getting inventory history', { error });
      throw new AppError('Failed to get inventory history', 500, 'INVENTORY_HISTORY_ERROR');
    }
  }

  /**
   * Check if sufficient stock is available
   */
  async checkAvailability(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    try {
      const inventory = await this.getInventory(productId);
      if (!inventory) {
        return false;
      }
      return inventory.availableStock >= quantity;
    } catch (error) {
      logger.error('Error checking availability', { error });
      return false;
    }
  }

  /**
   * Decrement stock (for direct sales without reservation)
   */
  async decrementStock(
    productId: string,
    quantity: number,
    performedBy?: string,
    reason: string = 'Sale'
  ): Promise<void> {
    try {
      const trx = await getDb().transaction();

      try {
        // Lock the row for update
        const inventory = await trx('inventory')
          .where({ product_id: productId })
          .forUpdate()
          .first();

        if (!inventory) {
          throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
        }

        if (inventory.available_stock < quantity) {
          throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
        }

        const newAvailableStock = inventory.available_stock - quantity;
        const newTotalStock = inventory.total_stock - quantity;

        // Update inventory
        await trx('inventory')
          .where({ product_id: productId })
          .update({
            total_stock: newTotalStock,
            available_stock: newAvailableStock,
            updated_at: trx.fn.now(),
          });

        // Record history
        await trx('inventory_history').insert({
          product_id: productId,
          change_type: 'sale',
          quantity_change: -quantity,
          previous_stock: inventory.total_stock,
          new_stock: newTotalStock,
          performed_by: performedBy,
          reason,
        });

        await trx.commit();

        // Invalidate cache
        await this.invalidateCache(productId);

        logger.info('Stock decremented', {
          event: 'inventory_decremented',
          productId,
          quantity,
          previousStock: inventory.total_stock,
          newStock: newTotalStock,
          performedBy: performedBy,
          reason: reason,
        });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error decrementing stock', { error });
      throw new AppError('Failed to decrement stock', 500, 'STOCK_DECREMENT_ERROR');
    }
  }

  /**
   * Increment stock (for returns)
   */
  async incrementStock(
    productId: string,
    quantity: number,
    performedBy?: string,
    reason: string = 'Return'
  ): Promise<void> {
    try {
      const trx = await getDb().transaction();

      try {
        const inventory = await trx('inventory')
          .where({ product_id: productId })
          .forUpdate()
          .first();

        if (!inventory) {
          throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
        }

        const newAvailableStock = inventory.available_stock + quantity;
        const newTotalStock = inventory.total_stock + quantity;

        // Update inventory
        await trx('inventory')
          .where({ product_id: productId })
          .update({
            total_stock: newTotalStock,
            available_stock: newAvailableStock,
            updated_at: trx.fn.now(),
          });

        // Record history
        await trx('inventory_history').insert({
          product_id: productId,
          change_type: 'return',
          quantity_change: quantity,
          previous_stock: inventory.total_stock,
          new_stock: newTotalStock,
          performed_by: performedBy,
          reason,
        });

        await trx.commit();

        // Invalidate cache
        await this.invalidateCache(productId);

        logger.info('Stock incremented', {
          event: 'inventory_incremented',
          productId,
          quantity,
          previousStock: inventory.total_stock,
          newStock: newTotalStock,
          performedBy: performedBy,
          reason: reason,
        });
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error incrementing stock', { error });
      throw new AppError('Failed to increment stock', 500, 'STOCK_INCREMENT_ERROR');
    }
  }

  /**
   * Restock inventory (add new stock)
   */
  async restockInventory(
    productId: string,
    quantity: number,
    performedBy?: string,
    reason: string = 'Restock'
  ): Promise<Inventory> {
    try {
      const trx = await getDb().transaction();

      try {
        const inventory = await trx('inventory')
          .where({ product_id: productId })
          .forUpdate()
          .first();

        if (!inventory) {
          throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
        }

        const newAvailableStock = inventory.available_stock + quantity;
        const newTotalStock = inventory.total_stock + quantity;

        // Update inventory
        await trx('inventory')
          .where({ product_id: productId })
          .update({
            total_stock: newTotalStock,
            available_stock: newAvailableStock,
            last_restocked_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

        // Record history
        await trx('inventory_history').insert({
          product_id: productId,
          change_type: 'restock',
          quantity_change: quantity,
          previous_stock: inventory.total_stock,
          new_stock: newTotalStock,
          performed_by: performedBy,
          reason,
        });

        await trx.commit();

        // Invalidate cache
        await this.invalidateCache(productId);

        logger.info('Inventory restocked', {
          event: 'inventory_restocked',
          productId,
          quantity,
          previousStock: inventory.total_stock,
          newStock: newTotalStock,
          performedBy: performedBy,
          reason: reason,
        });

        // Return updated inventory with full product details
        const updated = await getDb()('inventory')
          .join('products', 'inventory.product_id', 'products.id')
          .leftJoin('categories', 'products.category_id', 'categories.id')
          .where('inventory.product_id', productId)
          .select(
            'inventory.*',
            'products.id as product_id',
            'products.name as product_name',
            'products.unit_size as product_unit_size',
            'products.image_urls as product_image_urls',
            'categories.id as category_id',
            'categories.name as category_name'
          )
          .first();

        return this.mapToInventory(updated);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error restocking inventory', { error });
      throw new AppError('Failed to restock inventory', 500, 'RESTOCK_ERROR');
    }
  }

  /**
   * Reserve inventory for checkout (10-minute expiration)
   */
  async reserveInventory(
    userId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<string> {
    const trx = await getDb().transaction();

    try {
      const reservationId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Check and reserve each item
      for (const item of items) {
        const inventory = await trx('inventory')
          .where({ product_id: item.productId })
          .forUpdate()
          .first();

        if (!inventory) {
          throw new AppError(
            `Inventory not found for product ${item.productId}`,
            404,
            'INVENTORY_NOT_FOUND'
          );
        }

        if (inventory.available_stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product ${item.productId}`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        // Update inventory - move from available to reserved
        await trx('inventory')
          .where({ product_id: item.productId })
          .update({
            available_stock: inventory.available_stock - item.quantity,
            reserved_stock: inventory.reserved_stock + item.quantity,
            updated_at: trx.fn.now(),
          });

        // Create reservation record
        await trx('inventory_reservations').insert({
          id: reservationId,
          product_id: item.productId,
          quantity: item.quantity,
          user_id: userId,
          expires_at: expiresAt,
          status: 'active',
        });

        // Invalidate cache
        await this.invalidateCache(item.productId);
      }

      await trx.commit();

      logger.info('Inventory reserved', {
        reservationId,
        userId,
        itemCount: items.length,
      });

      return reservationId;
    } catch (error) {
      await trx.rollback();
      if (error instanceof AppError) throw error;
      logger.error('Error reserving inventory', { error });
      throw new AppError('Failed to reserve inventory', 500, 'RESERVATION_ERROR');
    }
  }

  /**
   * Commit reservation (on successful payment)
   */
  async commitReservation(reservationId: string): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Get all reservations with this ID
      const reservations = await trx('inventory_reservations')
        .where({ id: reservationId, status: 'active' })
        .forUpdate();

      if (reservations.length === 0) {
        throw new AppError('Reservation not found or already processed', 404, 'RESERVATION_NOT_FOUND');
      }

      // Check if expired
      const now = new Date();
      if (new Date(reservations[0].expires_at) < now) {
        throw new AppError('Reservation has expired', 400, 'RESERVATION_EXPIRED');
      }

      // Commit each reservation
      for (const reservation of reservations) {
        // Lock inventory row
        const inventory = await trx('inventory')
          .where({ product_id: reservation.product_id })
          .forUpdate()
          .first();

        if (!inventory) {
          throw new AppError('Inventory not found', 404, 'INVENTORY_NOT_FOUND');
        }

        // Decrement total and reserved stock
        await trx('inventory')
          .where({ product_id: reservation.product_id })
          .update({
            total_stock: inventory.total_stock - reservation.quantity,
            reserved_stock: inventory.reserved_stock - reservation.quantity,
            last_sale_date: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

        // Record history
        await trx('inventory_history').insert({
          product_id: reservation.product_id,
          change_type: 'sale',
          quantity_change: -reservation.quantity,
          previous_stock: inventory.total_stock,
          new_stock: inventory.total_stock - reservation.quantity,
          performed_by: reservation.user_id,
          reason: 'Order payment successful',
        });

        // Invalidate cache
        await this.invalidateCache(reservation.product_id);
      }

      // Mark reservations as committed
      await trx('inventory_reservations')
        .where({ id: reservationId })
        .update({
          status: 'committed',
          updated_at: trx.fn.now(),
        });

      await trx.commit();

      logger.info('Reservation committed', { reservationId });
    } catch (error) {
      await trx.rollback();
      if (error instanceof AppError) throw error;
      logger.error('Error committing reservation', { error });
      throw new AppError('Failed to commit reservation', 500, 'COMMIT_ERROR');
    }
  }

  /**
   * Release reservation (on payment failure or timeout)
   */
  async releaseReservation(reservationId: string): Promise<void> {
    const trx = await getDb().transaction();

    try {
      // Get all reservations with this ID
      const reservations = await trx('inventory_reservations')
        .where({ id: reservationId, status: 'active' })
        .forUpdate();

      if (reservations.length === 0) {
        // Already released or committed, no action needed
        logger.info('Reservation already processed', { reservationId });
        await trx.commit();
        return;
      }

      // Release each reservation
      for (const reservation of reservations) {
        // Lock inventory row
        const inventory = await trx('inventory')
          .where({ product_id: reservation.product_id })
          .forUpdate()
          .first();

        if (inventory) {
          // Move from reserved back to available
          await trx('inventory')
            .where({ product_id: reservation.product_id })
            .update({
              available_stock: inventory.available_stock + reservation.quantity,
              reserved_stock: inventory.reserved_stock - reservation.quantity,
              updated_at: trx.fn.now(),
            });

          // Invalidate cache
          await this.invalidateCache(reservation.product_id);
        }
      }

      // Mark reservations as released
      await trx('inventory_reservations')
        .where({ id: reservationId })
        .update({
          status: 'released',
          updated_at: trx.fn.now(),
        });

      await trx.commit();

      logger.info('Reservation released', { reservationId });
    } catch (error) {
      await trx.rollback();
      logger.error('Error releasing reservation', { error });
      throw new AppError('Failed to release reservation', 500, 'RELEASE_ERROR');
    }
  }

  /**
   * Clean up expired reservations (background job)
   */
  async cleanupExpiredReservations(): Promise<number> {
    try {
      const now = new Date();

      // Find expired active reservations
      const expiredReservations = await getDb()('inventory_reservations')
        .where('status', 'active')
        .where('expires_at', '<', now)
        .select('id')
        .groupBy('id');

      let cleanedCount = 0;

      for (const reservation of expiredReservations) {
        try {
          await this.releaseReservation(reservation.id);
          cleanedCount++;
        } catch (error) {
          logger.error('Error cleaning up reservation', {
            reservationId: reservation.id,
            error,
          });
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired reservations', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error in cleanup job', { error });
      return 0;
    }
  }



  /**
   * Invalidate inventory cache (no-op after Redis removal)
   */
  private async invalidateCache(productId: string): Promise<void> {
    // Cache invalidation removed - no longer using Redis
  }

  /**
   * Map database row to Inventory object
   */
  private mapToInventory(row: any): Inventory {
    const inventory: Inventory = {
      id: row.id,
      productId: row.product_id,
      totalStock: row.total_stock,
      availableStock: row.available_stock,
      reservedStock: row.reserved_stock,
      thresholdStock: row.threshold_stock,
      stockLevel: row.stock_level,
      lastRestockDate: row.last_restocked_at ? new Date(row.last_restocked_at) : undefined,
      lastSaleDate: row.last_sale_date ? new Date(row.last_sale_date) : undefined,
      lastUpdatedById: row.last_updated_by_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Include product details if available (from joined query)
    if (row.product_name) {
      inventory.product = {
        id: row.product_id,
        name: row.product_name,
        sku: row.product_sku,
        unitSize: row.product_unit_size,
        imageUrls: row.product_image_urls || [],
      };

      // Include category if available
      if (row.category_name) {
        inventory.product.category = {
          id: row.category_id,
          name: row.category_name,
        };
      }
    }

    return inventory;
  }



  /**
   * Map database row to InventoryHistory object
   */
  private mapToInventoryHistory(row: any): InventoryHistory {
    return {
      id: row.id,
      productId: row.product_id,
      changeType: row.change_type,
      quantityChange: row.quantity_change,
      previousStock: row.previous_stock,
      newStock: row.new_stock,
      performedBy: row.performed_by,
      reason: row.reason,
      createdAt: new Date(row.created_at),
    };
  }
}

export const inventoryService = new InventoryService();

