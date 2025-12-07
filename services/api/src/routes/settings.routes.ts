import { Router, Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * Get all settings
 * GET /api/settings
 */
router.get(
  '/',
  ...requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.getAllSettings();
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get a specific setting
 * GET /api/settings/:key
 */
router.get(
  '/:key',
  ...requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const value = await settingsService.getSetting(req.params.key);
      
      if (value === null) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      res.json({ key: req.params.key, value });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update a setting
 * PUT /api/settings/:key
 */
router.put(
  '/:key',
  ...requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { value, description, valueType } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: 'Value is required' });
      }
      
      await settingsService.setSetting(
        req.params.key,
        value.toString(),
        description,
        valueType || 'string'
      );
      
      res.json({ 
        message: 'Setting updated successfully',
        key: req.params.key,
        value 
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
