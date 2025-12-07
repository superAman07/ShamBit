import { getDatabase } from '@shambit/database';
import { createLogger, ConflictError, NotFoundError } from '@shambit/shared';
import { User } from '../types/auth.types';

const logger = createLogger('user-service');

/**
 * User Service for managing user data
 */
export class UserService {
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
   * Find user by mobile number
   */
  async findByMobileNumber(mobileNumber: string): Promise<User | null> {
    const row = await this.db('users')
      .where({ mobile_number: mobileNumber })
      .first();

    if (!row) {
      return null;
    }

    return this.mapToUser(row);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db('users')
      .where({ id })
      .first();

    if (!row) {
      return null;
    }

    return this.mapToUser(row);
  }

  /**
   * Create new user
   */
  async createUser(mobileNumber: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByMobileNumber(mobileNumber);
    if (existingUser) {
      throw new ConflictError(
        'User with this mobile number already exists',
        'USER_ALREADY_EXISTS'
      );
    }

    const [row] = await this.db('users')
      .insert({
        mobile_number: mobileNumber,
        is_active: true,
      })
      .returning('*');

    logger.info('User created', { userId: row.id, mobileNumber });

    return this.mapToUser(row);
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.db('users')
      .where({ id: userId })
      .update({
        last_login_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    logger.info('User last login updated', { userId });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<User> {
    const [row] = await this.db('users')
      .where({ id: userId })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    if (!row) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    logger.info('User profile updated', { userId });

    return this.mapToUser(row);
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    const deleted = await this.db('users')
      .where({ id: userId })
      .delete();

    if (!deleted) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    logger.info('User deleted', { userId });
  }

  /**
   * Check if user is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const row = await this.db('users')
      .where({ id: userId })
      .select('is_active')
      .first();

    return row?.is_active || false;
  }
}
