import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';

const logger = createLogger('offer-analytics-service');

export interface OfferPerformanceStats {
  offerId: string;
  offerTitle: string;
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  daysActive: number;
  revenuePerDay: number;
}

export class OfferAnalyticsService {
  private get db() {
    return getDatabase();
  }

  /**
   * Track offer view
   */
  async trackOfferView(offerId: string, userId?: string, sessionId?: string): Promise<void> {
    try {
      await this.db('offer_views').insert({
        offer_id: offerId,
        user_id: userId || null,
        session_id: sessionId || null,
      });
    } catch (error) {
      logger.error('Error tracking offer view', { error, offerId });
      // Don't throw - analytics tracking shouldn't break the app
    }
  }

  /**
   * Get offer performance statistics
   */
  async getOfferPerformance(offerId: string): Promise<OfferPerformanceStats> {
    // Get offer details
    const offer = await this.db('product_offers')
      .select(
        'product_offers.*',
        'products.name as product_name'
      )
      .leftJoin('products', 'product_offers.product_id', 'products.id')
      .where('product_offers.id', offerId)
      .first();

    if (!offer) {
      throw new AppError('Offer not found', 404, 'OFFER_NOT_FOUND');
    }

    // Get total views
    const [{ count: totalViews }] = await this.db('offer_views')
      .where('offer_id', offerId)
      .count('* as count');

    // Get order statistics
    const orderStats = await this.db('orders')
      .where('offer_id', offerId)
      .where('status', '!=', 'canceled')
      .select(
        this.db.raw('COUNT(*) as total_orders'),
        this.db.raw('SUM(total_amount) as total_revenue')
      )
      .first();

    const totalOrders = parseInt(orderStats?.total_orders || '0', 10);
    const totalRevenue = (parseInt(orderStats?.total_revenue || '0', 10)) / 100; // Convert from paise to rupees
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = parseInt(totalViews as string, 10) > 0 
      ? (totalOrders / parseInt(totalViews as string, 10)) * 100 
      : 0;

    // Calculate days active
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    const now = new Date();
    const activeUntil = now < endDate ? now : endDate;
    const daysActive = Math.max(1, Math.ceil((activeUntil.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const revenuePerDay = totalRevenue / daysActive;

    return {
      offerId: offer.id,
      offerTitle: offer.offer_title,
      productId: offer.product_id,
      productName: offer.product_name || 'Unknown Product',
      startDate: offer.start_date,
      endDate: offer.end_date,
      isActive: offer.is_active,
      totalViews: parseInt(totalViews as string, 10),
      totalOrders,
      totalRevenue,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      averageOrderValue,
      daysActive,
      revenuePerDay,
    };
  }

  /**
   * Get all offers performance summary
   */
  async getAllOffersPerformance(): Promise<OfferPerformanceStats[]> {
    const offers = await this.db('product_offers')
      .select('id')
      .where('is_active', true)
      .orderBy('created_at', 'desc');

    const performanceData = await Promise.all(
      offers.map(offer => this.getOfferPerformance(offer.id))
    );

    return performanceData;
  }
}

export const offerAnalyticsService = new OfferAnalyticsService();
