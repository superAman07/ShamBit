import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';

const logger = createLogger('settings-service');

export class SettingsService {
  private get db() {
    return getDatabase();
  }

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const setting = await this.db('settings')
        .where('key', key)
        .first();

      if (!setting) {
        return null;
      }

      return setting.value;
    } catch (error) {
      logger.error('Error getting setting', { error, key });
      throw new AppError('Failed to get setting', 500, 'SETTINGS_GET_ERROR');
    }
  }

  /**
   * Get a numeric setting value
   */
  async getNumericSetting(key: string): Promise<number | null> {
    const value = await this.getSetting(key);
    
    if (value === null) {
      return null;
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      logger.error('Setting value is not a valid number', { key, value });
      throw new AppError(`Setting ${key} is not a valid number`, 500, 'INVALID_SETTING_VALUE');
    }

    return numValue;
  }

  /**
   * Get tax rate percentage
   */
  async getTaxRate(): Promise<number> {
    const taxRate = await this.getNumericSetting('tax_rate');
    
    if (taxRate === null) {
      throw new AppError(
        'Tax rate not configured. Please configure tax_rate in settings.',
        500,
        'TAX_RATE_NOT_CONFIGURED'
      );
    }

    return taxRate;
  }

  /**
   * Get delivery fee in paise (considers free delivery threshold)
   */
  async getDeliveryFee(orderAmount?: number): Promise<number> {
    const deliveryFee = await this.getNumericSetting('delivery_fee');
    
    if (deliveryFee === null) {
      throw new AppError(
        'Delivery fee not configured. Please configure delivery_fee in settings.',
        500,
        'DELIVERY_FEE_NOT_CONFIGURED'
      );
    }

    // Check if order qualifies for free delivery
    if (orderAmount !== undefined) {
      const freeDeliveryThreshold = await this.getNumericSetting('free_delivery_threshold');
      
      if (freeDeliveryThreshold && orderAmount >= freeDeliveryThreshold) {
        return 0; // Free delivery
      }
    }

    return deliveryFee;
  }

  /**
   * Get free delivery threshold in paise
   */
  async getFreeDeliveryThreshold(): Promise<number | null> {
    return this.getNumericSetting('free_delivery_threshold');
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: string, description?: string, valueType: string = 'string'): Promise<void> {
    try {
      const existing = await this.db('settings')
        .where('key', key)
        .first();

      if (existing) {
        // Update existing setting
        await this.db('settings')
          .where('key', key)
          .update({
            value,
            description: description || existing.description,
            value_type: valueType,
            updated_at: this.db.fn.now(),
          });
      } else {
        // Insert new setting
        await this.db('settings').insert({
          key,
          value,
          description,
          value_type: valueType,
        });
      }

      logger.info('Setting updated', { key, value });
    } catch (error) {
      logger.error('Error setting value', { error, key });
      throw new AppError('Failed to update setting', 500, 'SETTINGS_UPDATE_ERROR');
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Array<{ key: string; value: string; description: string; valueType: string }>> {
    try {
      const settings = await this.db('settings')
        .select('key', 'value', 'description', 'value_type as valueType')
        .orderBy('key', 'asc');

      return settings;
    } catch (error) {
      logger.error('Error getting all settings', { error });
      throw new AppError('Failed to get settings', 500, 'SETTINGS_LIST_ERROR');
    }
  }
}

export const settingsService = new SettingsService();
