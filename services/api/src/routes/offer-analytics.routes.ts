import { Router, Request, Response, NextFunction } from 'express';
import { offerAnalyticsService } from '../services/offer-analytics.service';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/v1/offer-analytics/track-view
 * @desc    Track offer view (can be called from mobile app)
 * @access  Public
 */
router.post(
  '/track-view',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { offerId, sessionId } = req.body;
      const userId = req.user?.id;

      if (!offerId) {
        res.status(400).json({
          success: false,
          error: 'Offer ID is required',
        });
        return;
      }

      await offerAnalyticsService.trackOfferView(offerId, userId, sessionId);

      res.json({
        success: true,
        message: 'View tracked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/offer-analytics/:offerId/performance
 * @desc    Get performance statistics for a specific offer
 * @access  Admin only
 */
router.get(
  '/:offerId/performance',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const performance = await offerAnalyticsService.getOfferPerformance(req.params.offerId);

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/offer-analytics/performance/all
 * @desc    Get performance statistics for all active offers
 * @access  Admin only
 */
router.get(
  '/performance/all',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const performance = await offerAnalyticsService.getAllOffersPerformance();

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
