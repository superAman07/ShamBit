import { Router, Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { ValidationError } from '@shambit/shared';
import { UpdateProfileRequest, CreateAddressRequest, UpdateAddressRequest } from '../types/auth.types';

const router = Router();
const profileService = new ProfileService();

/**
 * @route   GET /api/v1/profile
 * @desc    Get user profile
 * @access  Private (Customer)
 */
router.get('/', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const profile = await profileService.getProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/profile
 * @desc    Update user profile
 * @access  Private (Customer)
 */
router.put('/', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const data: UpdateProfileRequest = req.body;

    // Validate request body
    if (!data.name && !data.email) {
      throw new ValidationError('At least one field (name or email) must be provided', 'INVALID_REQUEST');
    }

    const profile = await profileService.updateProfile(userId, data);

    res.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/profile/addresses
 * @desc    Get all user addresses
 * @access  Private (Customer)
 */
router.get('/addresses', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const addresses = await profileService.getAddresses(userId);

    res.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/profile/addresses/:id
 * @desc    Get a specific address
 * @access  Private (Customer)
 */
router.get('/addresses/:id', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const addressId = req.params.id;
    const address = await profileService.getAddressById(userId, addressId);

    res.json({
      success: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/profile/addresses
 * @desc    Create a new address
 * @access  Private (Customer)
 */
router.post('/addresses', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const data: CreateAddressRequest = req.body;

    // Validate required fields
    if (!data.addressLine1?.trim() || !data.city?.trim() || !data.state?.trim() || !data.pincode?.trim()) {
      throw new ValidationError('Missing required fields: addressLine1, city, state, pincode', 'INVALID_REQUEST');
    }

    const address = await profileService.createAddress(userId, data);

    res.status(201).json({
      success: true,
      data: address,
      message: 'Address created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/profile/addresses/:id
 * @desc    Update an existing address
 * @access  Private (Customer)
 */
router.put('/addresses/:id', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const addressId = req.params.id;
    const data: UpdateAddressRequest = req.body;

    const address = await profileService.updateAddress(userId, addressId, data);

    res.json({
      success: true,
      data: address,
      message: 'Address updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/profile/addresses/:id
 * @desc    Delete an address
 * @access  Private (Customer)
 */
router.delete('/addresses/:id', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const addressId = req.params.id;

    await profileService.deleteAddress(userId, addressId);

    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/profile/addresses/:id/set-default
 * @desc    Set an address as default
 * @access  Private (Customer)
 */
router.post('/addresses/:id/set-default', authenticate, authorize('customer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.sub;
    const addressId = req.params.id;

    const address = await profileService.setDefaultAddress(userId, addressId);

    res.json({
      success: true,
      data: address,
      message: 'Default address set successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
