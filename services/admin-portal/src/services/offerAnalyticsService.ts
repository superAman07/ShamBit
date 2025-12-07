/**
 * Offer Analytics Service
 * Handles all offer analytics related API calls
 */

import { apiService } from './api';

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

class OfferAnalyticsService {
  async getOfferPerformance(offerId: string): Promise<OfferPerformanceStats> {
    return apiService.get<OfferPerformanceStats>(`/offer-analytics/${offerId}/performance`);
  }

  async getAllOffersPerformance(): Promise<OfferPerformanceStats[]> {
    return apiService.get<OfferPerformanceStats[]>('/offer-analytics/performance/all');
  }

  async trackOfferView(offerId: string, sessionId?: string): Promise<void> {
    try {
      await apiService.post('/offer-analytics/track-view', { offerId, sessionId });
    } catch (error) {
      // Silently fail - analytics tracking shouldn't break the app
      console.error('Failed to track offer view', error);
    }
  }
}

export const offerAnalyticsService = new OfferAnalyticsService();
