import { Router } from 'express';
import { getDatabase } from '@shambit/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { errorResponse, successResponse } from '../utils/response';
import { ERROR_CODES } from '../constants/seller';

const router = Router();

// Test endpoint to verify routing works
router.get('/test', (_req, res) => {
  return res.json({
    success: true,
    message: 'Seller routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify authentication works
router.get('/auth-test', authenticateToken, (req: AuthenticatedRequest, res) => {
  return res.json({
    success: true,
    message: 'Authentication is working!',
    seller: req.seller,
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/seller/profile - Get seller profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  
  try {
    const sellerId = req.seller!.id;
    
    // Fetch seller data from database
    const seller = await db('sellers')
      .where('id', sellerId)
      .first();
    
    if (!seller) {
      return errorResponse(res, 404, ERROR_CODES.SELLER_NOT_FOUND, 'Seller not found');
    }
    
    // Parse JSON fields safely
    let businessDetails = null;
    if (seller.business_details) {
      try {
        businessDetails = typeof seller.business_details === 'string' 
          ? JSON.parse(seller.business_details) 
          : seller.business_details;
      } catch (error) {
        console.error('Error parsing business_details:', error);
        businessDetails = null;
      }
    }
    
    let taxCompliance = null;
    if (seller.tax_compliance) {
      try {
        taxCompliance = typeof seller.tax_compliance === 'string' 
          ? JSON.parse(seller.tax_compliance) 
          : seller.tax_compliance;
      } catch (error) {
        console.error('Error parsing tax_compliance:', error);
        taxCompliance = null;
      }
    }
    
    let bankDetails = null;
    if (seller.bank_details) {
      try {
        bankDetails = typeof seller.bank_details === 'string' 
          ? JSON.parse(seller.bank_details) 
          : seller.bank_details;
      } catch (error) {
        console.error('Error parsing bank_details:', error);
        bankDetails = null;
      }
    }
    
    let addressInfo = null;
    if (seller.address_info) {
      try {
        addressInfo = typeof seller.address_info === 'string' 
          ? JSON.parse(seller.address_info) 
          : seller.address_info;
      } catch (error) {
        console.error('Error parsing address_info:', error);
        addressInfo = null;
      }
    }
    
    // Map database fields to frontend expected format
    const sellerProfile = {
      id: seller.id,
      fullName: seller.full_name,
      mobile: seller.mobile,
      email: seller.email,
      mobileVerified: seller.mobile_verified,
      emailVerified: seller.email_verified,
      status: seller.status,
      verificationStatus: seller.overall_verification_status || seller.verification_status,
      canListProducts: seller.can_list_products,
      payoutEnabled: seller.payout_enabled,
      
      // Include parsed JSON objects if they exist
      ...(businessDetails ? { businessDetails } : {}),
      ...(taxCompliance ? { taxCompliance } : {}),
      ...(bankDetails ? { bankDetails } : {}),
      ...(addressInfo ? { addressInfo } : {}),
      
      accountStatus: seller.account_status || seller.status || 'active',
      createdAt: seller.created_at,
      updatedAt: seller.updated_at,
      
      // Add applicationStatus based on verification status
      applicationStatus: mapVerificationStatusToApplicationStatus(
        seller.overall_verification_status || seller.verification_status, 
        !!(businessDetails || taxCompliance || bankDetails)
      )
    };
    
    return successResponse(res, {
      seller: sellerProfile
    });
    
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to fetch seller profile');
  }
});

// PUT /api/v1/seller/profile/business - Update business details
router.put('/profile/business', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  
  try {
    const sellerId = req.seller!.id;
    const {
      businessName,
      businessType,
      natureOfBusiness,
      yearOfEstablishment,
      primaryProductCategories
    } = req.body;
    
    console.log('Updating business details for seller:', sellerId, req.body);
    
    // Validate and sanitize yearOfEstablishment
    let validatedYear = null;
    if (yearOfEstablishment !== undefined && yearOfEstablishment !== null && yearOfEstablishment !== '') {
      const year = parseInt(yearOfEstablishment);
      if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear()) {
        validatedYear = year;
      }
    }
    
    // Update business details in database
    await db('sellers')
      .where('id', sellerId)
      .update({
        business_name: businessName,
        business_type: businessType,
        nature_of_business: natureOfBusiness,
        year_of_establishment: validatedYear,
        primary_product_categories: primaryProductCategories,
        updated_at: db.fn.now()
      });
    
    console.log('Business details updated successfully for seller:', sellerId);
    
    return successResponse(res, {
      message: 'Business details updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating business details:', error);
    return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to update business details');
  }
});

// PUT /api/v1/seller/profile/tax - Update tax information
router.put('/profile/tax', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  
  try {
    const sellerId = req.seller!.id;
    const {
      panNumber,
      panHolderName,
      gstRegistered,
      gstNumber,
      aadhaarNumber
    } = req.body;
    
    // Update tax information in database
    await db('sellers')
      .where('id', sellerId)
      .update({
        pan_number: panNumber,
        pan_holder_name: panHolderName,
        gst_registered: gstRegistered,
        gst_number: gstNumber,
        gstin: gstNumber, // Also update gstin field
        aadhaar_number: aadhaarNumber,
        updated_at: db.fn.now()
      });
    
    return successResponse(res, {
      message: 'Tax information updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating tax information:', error);
    return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to update tax information');
  }
});

// PUT /api/v1/seller/profile/bank - Update bank details
router.put('/profile/bank', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  
  try {
    const sellerId = req.seller!.id;
    const {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType
    } = req.body;
    
    // Prepare bank details object
    const bankDetails = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType: accountType || 'savings',
      verificationStatus: 'pending'
    };
    
    // Update bank details in database
    await db('sellers')
      .where('id', sellerId)
      .update({
        bank_details: JSON.stringify(bankDetails),
        updated_at: db.fn.now()
      });
    
    return successResponse(res, {
      message: 'Bank details updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating bank details:', error);
    return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to update bank details');
  }
});

// Helper function to map database verification status to frontend application status
function mapVerificationStatusToApplicationStatus(
  verificationStatus: string, 
  profileCompleted: boolean
): 'incomplete' | 'submitted' | 'clarification_needed' | 'approved' | 'rejected' {
  // If profile is not completed, always return incomplete
  if (!profileCompleted) {
    return 'incomplete';
  }
  
  switch (verificationStatus) {
    case 'pending':
      return 'incomplete';
    case 'in_review':
      return 'submitted';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return 'incomplete';
  }
}

export default router;