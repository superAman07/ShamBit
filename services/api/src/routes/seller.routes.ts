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

// GET /api/seller/profile - Get seller profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  
  try {
    const sellerId = req.seller!.id;
    console.log('Fetching profile for seller ID:', sellerId);
    
    // Fetch seller data from database with minimal fields first
    let seller;
    try {
      seller = await db('sellers')
        .select([
          'id',
          'full_name',
          'mobile',
          'email',
          'mobile_verified',
          'email_verified',
          'overall_verification_status'
        ])
        .where('id', sellerId)
        .first();
      
      console.log('Basic seller data:', seller ? 'Found' : 'Not found');
      
      if (seller) {
        // Try to get additional fields
        const additionalData = await db('sellers')
          .select([
            'business_name',
            'business_type',
            'nature_of_business',
            'year_of_establishment',
            'primary_product_categories',
            'registered_business_address',
            'warehouse_addresses',
            'gst_registered',
            'gst_number',
            'gstin',
            'pan_number',
            'pan_holder_name',
            'aadhaar_number',
            'bank_details',
            'documents',
            'rejection_reason',
            'verification_notes',
            'profile_completed',
            'created_at',
            'updated_at'
          ])
          .where('id', sellerId)
          .first();
        
        // Merge the data
        seller = { ...seller, ...additionalData };
        console.log('Extended seller data retrieved');
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw dbError;
    }
    
    console.log('Database query result:', seller ? 'Found seller' : 'Seller not found');
    
    if (!seller) {
      console.log('Seller not found for ID:', sellerId);
      return errorResponse(res, 404, ERROR_CODES.SELLER_NOT_FOUND, 'Seller not found');
    }
    
    // Parse JSON fields safely
    let registeredAddress = null;
    let bankDetails = null;
    let documents = {};
    
    try {
      if (seller.registered_business_address) {
        // Handle both JSON string and object cases
        if (typeof seller.registered_business_address === 'string') {
          registeredAddress = JSON.parse(seller.registered_business_address);
        } else if (typeof seller.registered_business_address === 'object') {
          registeredAddress = seller.registered_business_address;
        }
      }
    } catch (e) {
      console.warn('Failed to parse registered_business_address:', e);
    }
    
    try {
      if (seller.warehouse_addresses) {
        // Handle both JSON string and object cases
        if (typeof seller.warehouse_addresses === 'string') {
          // warehouseAddresses = JSON.parse(seller.warehouse_addresses);
        } else if (Array.isArray(seller.warehouse_addresses)) {
          // warehouseAddresses = seller.warehouse_addresses;
        }
      }
    } catch (e) {
      console.warn('Failed to parse warehouse_addresses:', e);
    }
    
    try {
      if (seller.bank_details) {
        // Handle both JSON string and object cases
        if (typeof seller.bank_details === 'string') {
          bankDetails = JSON.parse(seller.bank_details);
        } else if (typeof seller.bank_details === 'object') {
          bankDetails = seller.bank_details;
        }
      }
    } catch (e) {
      console.warn('Failed to parse bank_details:', e);
    }
    
    try {
      if (seller.documents) {
        // Handle both JSON string and object cases
        if (typeof seller.documents === 'string') {
          documents = JSON.parse(seller.documents);
        } else if (typeof seller.documents === 'object') {
          documents = seller.documents;
        }
      }
    } catch (e) {
      console.warn('Failed to parse documents:', e);
    }
    
    // Map database verification status to frontend application status
    const applicationStatus = mapVerificationStatusToApplicationStatus(
      seller.overall_verification_status, 
      seller.profile_completed
    );
    
    // Build business details if any business info exists
    const businessDetails = (seller.business_name || seller.business_type || seller.nature_of_business) ? {
      businessName: seller.business_name || undefined,
      businessType: seller.business_type || undefined,
      natureOfBusiness: seller.nature_of_business || undefined,
      yearOfEstablishment: seller.year_of_establishment || undefined,
      primaryProductCategories: seller.primary_product_categories || undefined
    } : undefined;
    
    // Build tax compliance if PAN exists
    const taxCompliance = seller.pan_number ? {
      panNumber: seller.pan_number,
      panHolderName: seller.pan_holder_name || seller.full_name,
      gstRegistered: seller.gst_registered || false,
      gstNumber: seller.gst_number || seller.gstin || undefined,
      aadhaarNumber: seller.aadhaar_number || undefined,
      gstExempt: !seller.gst_registered,
      exemptionReason: !seller.gst_registered ? 'turnover_below_threshold' : undefined,
      turnoverDeclaration: undefined
    } : undefined;
    
    // Build bank details if they exist
    const mappedBankDetails = bankDetails ? {
      accountHolderName: bankDetails.accountHolderName || bankDetails.account_holder_name || seller.full_name,
      bankName: bankDetails.bankName || bankDetails.bank_name || '',
      accountNumber: bankDetails.accountNumber || bankDetails.account_number || '',
      ifscCode: bankDetails.ifscCode || bankDetails.ifsc_code || '',
      accountType: (bankDetails.accountType || bankDetails.account_type || 'savings') as 'savings' | 'current',
      verificationStatus: (bankDetails.verificationStatus || bankDetails.verification_status || 'pending') as 'pending' | 'verified' | 'rejected'
    } : undefined;
    
    // Build address info if registered address exists
    const addressInfo = registeredAddress ? {
      registeredAddress: {
        line1: registeredAddress.addressLine1 || registeredAddress.line1 || '',
        line2: registeredAddress.addressLine2 || registeredAddress.line2 || '',
        city: registeredAddress.city || '',
        state: registeredAddress.state || '',
        pincode: registeredAddress.pinCode || registeredAddress.pincode || '',
        country: 'India' as const
      }
    } : undefined;
    
    // Convert documents object to array format expected by frontend
    const documentsArray = Object.keys(documents).length > 0 ? 
      Object.keys(documents).map(docType => {
        const doc = documents[docType as keyof typeof documents] as any;
        return {
          id: `${sellerId}-${docType}`,
          type: docType,
          fileName: doc?.fileName || `${docType}.pdf`,
          uploadedAt: doc?.uploadedAt || seller.created_at,
          verificationStatus: doc?.verified ? 'verified' : 
                             doc?.uploaded ? 'pending' : 'not_uploaded'
        };
      }) : undefined;
    
    // Parse clarification requests from verification notes
    const clarificationRequests = seller.verification_notes && 
      seller.overall_verification_status === 'in_review' ? 
      [seller.verification_notes] : undefined;
    
    // Build the response matching frontend expectations exactly
    const sellerProfile = {
      fullName: seller.full_name || '',
      mobile: seller.mobile || '',
      email: seller.email || '',
      mobileVerified: seller.mobile_verified || false,
      emailVerified: seller.email_verified || false,
      applicationStatus,
      businessDetails,
      taxCompliance,
      bankDetails: mappedBankDetails,
      documents: documentsArray,
      addressInfo,
      rejectionReason: seller.rejection_reason || undefined,
      clarificationRequests
    };
    
    console.log('Sending response with seller profile');
    return res.json({
      seller: sellerProfile
    });
    
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      sellerId: req.seller?.id
    });
    return errorResponse(res, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to fetch seller profile');
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