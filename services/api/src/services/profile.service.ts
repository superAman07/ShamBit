import { getDatabase } from '@shambit/database';
import { createLogger, NotFoundError, ValidationError, ConflictError } from '@shambit/shared';
import { User, UserAddress, UpdateProfileRequest, CreateAddressRequest, UpdateAddressRequest } from '../types/auth.types';

const logger = createLogger('profile-service');

/**
 * Profile Service for managing user profiles and addresses
 */
export class ProfileService {
  private get db() {
    return getDatabase();
  }

  /**
   * Convert database row to User object
   */
  private mapToUser(row: any): User {
    return {
      id: row.id,
      mobileNumber: row.mobile_number,
      name: row.name,
      email: row.email,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }

  /**
   * Convert database row to UserAddress object
   */
  private mapToAddress(row: any): UserAddress {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type || 'home',
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      landmark: row.landmark,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User> {
    const row = await this.db('users')
      .where({ id: userId })
      .first();

    if (!row) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return this.mapToUser(row);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<User> {
    // Validate email if provided
    if (data.email && !this.validateEmail(data.email)) {
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL');
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    const [row] = await this.db('users')
      .where({ id: userId })
      .update(updateData)
      .returning('*');

    if (!row) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    logger.info('User profile updated', { userId });

    return this.mapToUser(row);
  }

  /**
   * Get all addresses for a user
   */
  async getAddresses(userId: string): Promise<UserAddress[]> {
    const rows = await this.db('user_addresses')
      .where({ user_id: userId })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'desc');

    return rows.map(row => this.mapToAddress(row));
  }

  /**
   * Get a specific address by ID
   */
  async getAddressById(userId: string, addressId: string): Promise<UserAddress> {
    const row = await this.db('user_addresses')
      .where({ id: addressId, user_id: userId })
      .first();

    if (!row) {
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    }

    return this.mapToAddress(row);
  }

  /**
   * Create a new address
   */
  async createAddress(userId: string, data: CreateAddressRequest): Promise<UserAddress> {
    // If this is set as default, unset other default addresses
    if (data.isDefault) {
      await this.db('user_addresses')
        .where({ user_id: userId, is_default: true })
        .update({ is_default: false, updated_at: this.db.fn.now() });
    }

    const [row] = await this.db('user_addresses')
      .insert({
        user_id: userId,
        type: data.type || 'home',
        address_line1: data.addressLine1,
        address_line2: data.addressLine2 || null,
        landmark: data.landmark || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        is_default: data.isDefault || false,
      })
      .returning('*');

    logger.info('Address created', { userId, addressId: row.id });

    return this.mapToAddress(row);
  }

  /**
   * Update an existing address
   */
  async updateAddress(userId: string, addressId: string, data: UpdateAddressRequest): Promise<UserAddress> {
    // Check if address exists and belongs to user
    const existingAddress = await this.db('user_addresses')
      .where({ id: addressId, user_id: userId })
      .first();

    if (!existingAddress) {
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    }

    // If setting as default, unset other default addresses
    if (data.isDefault) {
      await this.db('user_addresses')
        .where({ user_id: userId, is_default: true })
        .whereNot({ id: addressId })
        .update({ is_default: false, updated_at: this.db.fn.now() });
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.addressLine1 !== undefined) updateData.address_line1 = data.addressLine1;
    if (data.addressLine2 !== undefined) updateData.address_line2 = data.addressLine2;
    if (data.landmark !== undefined) updateData.landmark = data.landmark;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.pincode !== undefined) updateData.pincode = data.pincode;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

    const [row] = await this.db('user_addresses')
      .where({ id: addressId })
      .update(updateData)
      .returning('*');

    logger.info('Address updated', { userId, addressId });

    return this.mapToAddress(row);
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const deleted = await this.db('user_addresses')
      .where({ id: addressId, user_id: userId })
      .delete();

    if (!deleted) {
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    }

    logger.info('Address deleted', { userId, addressId });
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<UserAddress> {
    // Check if address exists and belongs to user
    const existingAddress = await this.db('user_addresses')
      .where({ id: addressId, user_id: userId })
      .first();

    if (!existingAddress) {
      throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
    }

    // Unset all other default addresses
    await this.db('user_addresses')
      .where({ user_id: userId, is_default: true })
      .whereNot({ id: addressId })
      .update({ is_default: false, updated_at: this.db.fn.now() });

    // Set this address as default
    const [row] = await this.db('user_addresses')
      .where({ id: addressId })
      .update({ is_default: true, updated_at: this.db.fn.now() })
      .returning('*');

    logger.info('Default address set', { userId, addressId });

    return this.mapToAddress(row);
  }
}
