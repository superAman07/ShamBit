import bcrypt from 'bcrypt';
import { getDatabase } from '@shambit/database';
import { createLogger, ConflictError, NotFoundError, UnauthorizedError, BadRequestError } from '@shambit/shared';
import { Admin, AdminAuditLog } from '../types/admin.types';
import { AdminRole } from '@shambit/shared';

const logger = createLogger('admin-service');

/**
 * Admin Service for managing admin users
 */
export class AdminService {
  private get db() {
    return getDatabase();
  }
  private SALT_ROUNDS = 10;

  /**
   * Convert database row to Admin object
   */
  private mapToAdmin(row: any): Admin {
    return {
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      role: row.role as AdminRole,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password complexity
   */
  validatePasswordComplexity(password: string): void {
    if (password.length < 8) {
      throw new BadRequestError(
        'Password must be at least 8 characters long',
        'PASSWORD_TOO_SHORT'
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new BadRequestError(
        'Password must contain at least one uppercase letter',
        'PASSWORD_NO_UPPERCASE'
      );
    }

    if (!/[0-9]/.test(password)) {
      throw new BadRequestError(
        'Password must contain at least one number',
        'PASSWORD_NO_NUMBER'
      );
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestError(
        'Password must contain at least one special character',
        'PASSWORD_NO_SPECIAL'
      );
    }
  }

  /**
   * Find admin by username
   */
  async findByUsername(username: string): Promise<Admin | null> {
    const row = await this.db('admins')
      .where({ username })
      .first();

    if (!row) {
      return null;
    }

    return this.mapToAdmin(row);
  }

  /**
   * Find admin by ID
   */
  async findById(id: string): Promise<Admin | null> {
    const row = await this.db('admins')
      .where({ id })
      .first();

    if (!row) {
      return null;
    }

    return this.mapToAdmin(row);
  }

  /**
   * Create new admin
   */
  async createAdmin(
    username: string,
    password: string,
    name: string,
    email: string,
    role: AdminRole
  ): Promise<Admin> {
    // Check if admin already exists
    const existingAdmin = await this.findByUsername(username);
    if (existingAdmin) {
      throw new ConflictError(
        'Admin with this username already exists',
        'ADMIN_ALREADY_EXISTS'
      );
    }

    // Validate password complexity
    this.validatePasswordComplexity(password);

    // Hash password
    const passwordHash = await this.hashPassword(password);

    const [row] = await this.db('admins')
      .insert({
        username,
        password_hash: passwordHash,
        name,
        email,
        role,
        is_active: true,
      })
      .returning('*');

    logger.info('Admin created', { adminId: row.id, username, role });

    return this.mapToAdmin(row);
  }

  /**
   * Authenticate admin
   */
  async authenticate(username: string, password: string): Promise<Admin> {
    const row = await this.db('admins')
      .where({ username })
      .first();

    if (!row) {
      throw new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await this.verifyPassword(password, row.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS');
    }

    const admin = this.mapToAdmin(row);

    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account is inactive', 'ACCOUNT_INACTIVE');
    }

    return admin;
  }

  /**
   * Update admin's last login timestamp
   */
  async updateLastLogin(adminId: string): Promise<void> {
    await this.db('admins')
      .where({ id: adminId })
      .update({
        last_login_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });

    logger.info('Admin last login updated', { adminId });
  }

  /**
   * Log admin action to audit log
   */
  async logAuditAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes: changes ? JSON.stringify(changes) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    logger.info('Admin action logged', {
      adminId,
      action,
      resourceType,
      resourceId,
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(
    filters: {
      adminId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit = 100,
    offset = 0
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    let query = this.db('admin_audit_logs');

    // Apply filters
    if (filters.adminId) {
      query = query.where({ admin_id: filters.adminId });
    }

    if (filters.action) {
      query = query.where({ action: filters.action });
    }

    if (filters.resourceType) {
      query = query.where({ resource_type: filters.resourceType });
    }

    if (filters.resourceId) {
      query = query.where({ resource_id: filters.resourceId });
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');
    const total = parseInt(count as string, 10);

    // Get paginated results
    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const logs = rows.map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: row.changes,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    }));

    return { logs, total };
  }

  /**
   * Get audit log by ID (read-only)
   */
  async getAuditLogById(id: string): Promise<AdminAuditLog | null> {
    const row = await this.db('admin_audit_logs')
      .where({ id })
      .first();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      adminId: row.admin_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      changes: row.changes,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }

  /**
   * Update admin
   */
  async updateAdmin(
    adminId: string,
    data: { name?: string; email?: string; role?: AdminRole; isActive?: boolean }
  ): Promise<Admin> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [row] = await this.db('admins')
      .where({ id: adminId })
      .update(updateData)
      .returning('*');

    if (!row) {
      throw new NotFoundError('Admin not found', 'ADMIN_NOT_FOUND');
    }

    logger.info('Admin updated', { adminId });

    return this.mapToAdmin(row);
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, newPassword: string): Promise<void> {
    // Validate password complexity
    this.validatePasswordComplexity(newPassword);

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    await this.db('admins')
      .where({ id: adminId })
      .update({
        password_hash: passwordHash,
        updated_at: this.db.fn.now(),
      });

    logger.info('Admin password changed', { adminId });
  }

  /**
   * List all admins
   */
  async listAdmins(limit = 50, offset = 0): Promise<Admin[]> {
    const rows = await this.db('admins')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.mapToAdmin(row));
  }
}
