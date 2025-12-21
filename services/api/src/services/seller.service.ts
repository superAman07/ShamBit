import { getDatabase } from '@shambit/database';
import { 
  SellerRegistrationData, 
  Seller, 
  SellerFilters, 
  SellerListResponse, 
  SellerStatistics,
  DocumentUploadRequest,
  DocumentVerification,
  SellerUpdate,
  SellerStatusUpdate,
  SellerDocuments,
  WarehouseAddress
} from '../types/seller.types';

class SellerService {
  /**
   * Register a new seller with comprehensive details
   */
  async registerSeller(data: SellerRegistrationData): Promise<Seller> {
    const db = getDatabase();
    
    // Hash password before storing
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Initialize document structure
    const initialDocuments: SellerDocuments = {
      panCard: { uploaded: false, verified: false },
      aadhaarCard: { uploaded: false, verified: false },
      addressProof: { uploaded: false, verified: false },
      photograph: { uploaded: false, verified: false },
      cancelledCheque: { uploaded: false, verified: false }
    };
    
    // Add conditional documents based on seller type and GST registration
    if (data.sellerType === 'business') {
      initialDocuments.businessCertificate = { uploaded: false, verified: false };
    }
    
    if (data.gstRegistered) {
      initialDocuments.gstCertificate = { uploaded: false, verified: false };
    }
    
    const [result] = await db('sellers').insert({
      // Part A: Personal Details
      full_name: data.fullName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      mobile: data.mobile,
      email: data.email,
      password_hash: hashedPassword,
      
      // Part B: Business Information
      seller_type: data.sellerType,
      business_type: data.businessType || null,
      business_name: data.businessName || null,
      nature_of_business: data.natureOfBusiness || null,
      primary_business_activity: data.primaryBusinessActivity || null,
      year_of_establishment: data.yearOfEstablishment || null,
      business_phone: data.businessPhone || null,
      business_email: data.businessEmail || null,
      
      // Part C: Address Information
      registered_business_address: db.raw('?::jsonb', [JSON.stringify(data.registeredBusinessAddress)]),
      warehouse_addresses: db.raw('?::jsonb', [JSON.stringify(data.warehouseAddresses)]),
      
      // Part D: Tax & Compliance Details
      gst_registered: data.gstRegistered,
      gst_number: data.gstNumber || null,
      gstin: data.gstin || null,
      pan_number: data.panNumber,
      pan_holder_name: data.panHolderName,
      tds_applicable: data.tdsApplicable || false,
      aadhaar_number: data.aadhaarNumber || null,
      
      // Part E: Bank Account Details
      bank_details: db.raw('?::jsonb', [JSON.stringify(data.bankDetails)]),
      
      // Part F: Document Upload Status
      documents: db.raw('?::jsonb', [JSON.stringify(initialDocuments)]),
      
      // Operational Information
      primary_product_categories: data.primaryProductCategories,
      estimated_monthly_order_volume: data.estimatedMonthlyOrderVolume,
      preferred_pickup_time_slots: data.preferredPickupTimeSlots,
      max_order_processing_time: data.maxOrderProcessingTime,
      
      // Verification Status
      mobile_verified: data.mobileVerified || false,
      email_verified: data.emailVerified || false,
      documents_verified: false,
      overall_verification_status: 'pending',
      
      // Financial Terms & Agreements
      commission_rate_accepted: data.commissionRateAccepted,
      payment_settlement_terms_accepted: data.paymentSettlementTermsAccepted,
      
      // Legal Declarations & Agreements
      terms_and_conditions_accepted: data.termsAndConditionsAccepted,
      return_policy_accepted: data.returnPolicyAccepted,
      data_compliance_accepted: data.dataComplianceAccepted,
      privacy_policy_accepted: data.privacyPolicyAccepted,
      
      // System Fields
      status: 'pending',
      login_credentials_generated: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    return this.mapSellerFromDb(result);
  }

  /**
   * Find seller by email or mobile
   */
  async findSellerByEmailOrMobile(email: string, mobile: string): Promise<Seller | null> {
    const db = getDatabase();
    const seller = await db('sellers')
      .where('email', email)
      .orWhere('mobile', mobile)
      .first();
    
    return seller ? this.mapSellerFromDb(seller) : null;
  }

  /**
   * Send mobile OTP for verification
   */
  async sendMobileOtp(mobile: string): Promise<{ success: boolean }> {
    const { otpService } = await import('./otp.service');
    const { smsService } = await import('./sms.service');
    
    // Generate 6-digit OTP with 5-minute expiry
    const otp = await otpService.generateOTP(mobile, 'mobile_verification', 300);
    
    // Send OTP via SMS
    await smsService.sendOTP({
      to: mobile,
      otp,
      purpose: 'mobile verification for seller registration'
    });
    
    return { success: true };
  }

  /**
   * Verify mobile OTP
   */
  async verifyMobileOtp(mobile: string, otp: string): Promise<{ verified: boolean }> {
    const { otpService } = await import('./otp.service');
    
    const isValid = await otpService.verifyOTP(mobile, otp, 'mobile_verification');
    
    if (isValid) {
      // Update seller mobile verification status
      const db = getDatabase();
      await db('sellers')
        .where('mobile', mobile)
        .update({
          mobile_verified: true,
          updated_at: new Date()
        });
    }
    
    return { verified: isValid };
  }

  /**
   * Send email OTP for verification
   */
  async sendEmailOtp(email: string): Promise<{ success: boolean }> {
    const { otpService } = await import('./otp.service');
    const { emailService } = await import('./email.service');
    
    // Generate 6-digit OTP with 5-minute expiry
    const otp = await otpService.generateOTP(email, 'email_verification', 300);
    
    // Send OTP via email
    await emailService.sendOTP({
      to: email,
      otp,
      purpose: 'Email verification for seller registration'
    });
    
    return { success: true };
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOtp(email: string, otp: string): Promise<{ verified: boolean }> {
    const { otpService } = await import('./otp.service');
    
    const isValid = await otpService.verifyOTP(email, otp, 'email_verification');
    
    if (isValid) {
      // Update seller email verification status
      const db = getDatabase();
      await db('sellers')
        .where('email', email)
        .update({
          email_verified: true,
          updated_at: new Date()
        });
    }
    
    return { verified: isValid };
  }

  /**
   * Get sellers with filters and pagination
   */
  async getSellers(filters: SellerFilters): Promise<SellerListResponse> {
    const db = getDatabase();
    
    // Build base query for filters
    const buildBaseQuery = () => {
      let baseQuery = db('sellers');
      
      // Apply filters
      if (filters.status) {
        baseQuery = baseQuery.where('status', filters.status);
      }
      
      if (filters.search) {
        baseQuery = baseQuery.where(function(this: any) {
          this.where('business_name', 'ilike', `%${filters.search}%`)
              .orWhere('owner_name', 'ilike', `%${filters.search}%`)
              .orWhere('email', 'ilike', `%${filters.search}%`)
              .orWhere('phone', 'like', `%${filters.search}%`);
        });
      }
      
      return baseQuery;
    };
    
    // Get total count
    const [{ count }] = await buildBaseQuery().count('* as count');
    const total = parseInt(count as string);
    
    // Get paginated results
    const offset = (filters.page - 1) * filters.pageSize;
    const sellers = await buildBaseQuery()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(filters.pageSize)
      .offset(offset);
    
    return {
      sellers: sellers.map(this.mapSellerFromDb),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize)
    };
  }

  /**
   * Get seller by ID
   */
  async getSellerById(id: string): Promise<Seller | null> {
    const db = getDatabase();
    const seller = await db('sellers').where('id', id).first();
    
    if (!seller) {
      return null;
    }
    
    return this.mapSellerFromDb(seller);
  }

  /**
   * Update seller status
   */
  async updateSellerStatus(
    id: string, 
    status: 'approved' | 'rejected' | 'suspended', 
    notes?: string
  ): Promise<Seller> {
    const updateData: any = {
      status,
      updated_at: new Date()
    };
    
    if (notes) {
      updateData.verification_notes = notes;
    }
    
    if (status === 'approved') {
      updateData.approved_at = new Date();
    }
    
    const db = getDatabase();
    await db('sellers').where('id', id).update(updateData);
    
    const updatedSeller = await this.getSellerById(id);
    if (!updatedSeller) {
      throw new Error('Seller not found after update');
    }
    
    return updatedSeller;
  }

  /**
   * Get seller statistics
   */
  async getSellerStatistics(): Promise<SellerStatistics> {
    const db = getDatabase();
    
    // Get total counts by status
    const statusCounts = await db('sellers')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0
    };
    
    statusCounts.forEach((row: any) => {
      const count = parseInt(row.count as string);
      stats.total += count;
      stats[row.status as keyof typeof stats] = count;
    });
    
    // Get documents verification statistics
    const [{ count: documentsVerifiedCount }] = await db('sellers')
      .where('documents_verified', true)
      .count('* as count');
    
    const [{ count: documentsPendingCount }] = await db('sellers')
      .where('documents_verified', false)
      .count('* as count');
    
    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [{ count: recentCount }] = await db('sellers')
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as count');
    
    // Get top cities from registered business addresses
    const sellers = await db('sellers').select('registered_business_address');
    const cityCount: { [key: string]: number } = {};
    
    sellers.forEach((seller: any) => {
      if (seller.registered_business_address) {
        const address = seller.registered_business_address;
        const city = address.city;
        if (city) {
          cityCount[city] = (cityCount[city] || 0) + 1;
        }
      }
    });
    
    const topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Get business type distribution
    const businessTypeDistribution = await db('sellers')
      .select('business_type as type')
      .count('* as count')
      .whereNotNull('business_type')
      .groupBy('business_type')
      .orderBy('count', 'desc');
    
    // Get verification status distribution
    const verificationStatusDistribution = await db('sellers')
      .select('overall_verification_status as status')
      .count('* as count')
      .groupBy('overall_verification_status')
      .orderBy('count', 'desc');
    
    return {
      ...stats,
      documentsVerified: parseInt(documentsVerifiedCount as string),
      documentsPending: parseInt(documentsPendingCount as string),
      recentRegistrations: parseInt(recentCount as string),
      topCities,
      businessTypeDistribution: businessTypeDistribution.map((row: any) => ({
        type: row.type || 'Not Specified',
        count: parseInt(row.count as string)
      })),
      verificationStatusDistribution: verificationStatusDistribution.map((row: any) => ({
        status: row.status,
        count: parseInt(row.count as string)
      }))
    };
  }

  /**
   * Upload seller document
   */
  async uploadSellerDocument(sellerId: string, documentData: DocumentUploadRequest): Promise<{ success: boolean; document: any }> {
    const db = getDatabase();
    
    // Get current seller and documents
    const seller = await db('sellers').where('id', sellerId).first();
    if (!seller) {
      throw new Error('Seller not found');
    }
    
    const currentDocs: SellerDocuments = seller.documents || {};
    
    // Update the specific document
    currentDocs[documentData.documentType] = {
      uploaded: true,
      url: documentData.documentUrl,
      verified: false,
      uploadedAt: new Date(),
      fileName: documentData.fileName,
      fileSize: documentData.fileSize,
      mimeType: documentData.mimeType
    };
    
    await db('sellers')
      .where('id', sellerId)
      .update({
        documents: db.raw('?::jsonb', [JSON.stringify(currentDocs)]),
        updated_at: new Date()
      });
    
    // Create notification for admin
    await this.createSellerNotification(sellerId, {
      type: 'document_uploaded',
      title: 'Document Uploaded',
      message: `${documentData.documentType} has been uploaded and is pending verification.`,
      data: { documentType: documentData.documentType }
    });
    
    return { 
      success: true, 
      document: currentDocs[documentData.documentType] 
    };
  }

  /**
   * Get seller documents
   */
  async getSellerDocuments(sellerId: string): Promise<SellerDocuments> {
    const db = getDatabase();
    
    const seller = await db('sellers').where('id', sellerId).first();
    if (!seller) {
      throw new Error('Seller not found');
    }
    
    return seller.documents || {};
  }

  /**
   * Verify individual seller document (admin)
   */
  async verifySellerDocument(sellerId: string, verificationData: DocumentVerification): Promise<{ success: boolean; document: any }> {
    const db = getDatabase();
    
    const seller = await db('sellers').where('id', sellerId).first();
    if (!seller) {
      throw new Error('Seller not found');
    }
    
    const documents: SellerDocuments = seller.documents || {};
    
    if (!documents[verificationData.documentType]) {
      throw new Error('Document not found or not uploaded');
    }
    
    // Update document verification status
    const existingDoc = documents[verificationData.documentType];
    if (existingDoc) {
      documents[verificationData.documentType] = {
        ...existingDoc,
        verified: verificationData.verified,
        verificationNotes: verificationData.verificationNotes,
        verifiedAt: new Date(),
        verifiedBy: verificationData.adminId
      };
    }
    
    await db('sellers')
      .where('id', sellerId)
      .update({
        documents: db.raw('?::jsonb', [JSON.stringify(documents)]),
        updated_at: new Date()
      });
    
    // Check if all required documents are now verified
    const documentsStatus = await this.checkDocumentsVerificationStatus(sellerId);
    
    if (documentsStatus.allVerified) {
      await db('sellers')
        .where('id', sellerId)
        .update({
          documents_verified: true,
          overall_verification_status: 'in_review',
          updated_at: new Date()
        });
    }
    
    // Create notification for seller
    await this.createSellerNotification(sellerId, {
      type: verificationData.verified ? 'document_verified' : 'document_rejected',
      title: `Document ${verificationData.verified ? 'Verified' : 'Rejected'}`,
      message: `Your ${verificationData.documentType} has been ${verificationData.verified ? 'verified' : 'rejected'}.${verificationData.verificationNotes ? ' Notes: ' + verificationData.verificationNotes : ''}`,
      data: { 
        documentType: verificationData.documentType, 
        verified: verificationData.verified,
        notes: verificationData.verificationNotes 
      }
    });
    
    return { 
      success: true, 
      document: documents[verificationData.documentType] 
    };
  }

  /**
   * Check documents verification status
   */
  async checkDocumentsVerificationStatus(sellerId: string): Promise<{
    allVerified: boolean;
    missingDocuments: string[];
    unverifiedDocuments: string[];
    totalRequired: number;
    totalVerified: number;
  }> {
    const db = getDatabase();
    
    const seller = await db('sellers').where('id', sellerId).first();
    if (!seller) {
      throw new Error('Seller not found');
    }
    
    const documents: SellerDocuments = seller.documents || {};
    
    // Define required documents based on seller type and GST registration
    const requiredDocuments = [
      'panCard',
      'aadhaarCard',
      'addressProof',
      'photograph',
      'cancelledCheque'
    ];
    
    if (seller.seller_type === 'business') {
      requiredDocuments.push('businessCertificate');
    }
    
    if (seller.gst_registered) {
      requiredDocuments.push('gstCertificate');
    }
    
    const missingDocuments: string[] = [];
    const unverifiedDocuments: string[] = [];
    let totalVerified = 0;
    
    requiredDocuments.forEach(docType => {
      const doc = documents[docType as keyof SellerDocuments];
      
      if (!doc || !doc.uploaded) {
        missingDocuments.push(docType);
      } else if (!doc.verified) {
        unverifiedDocuments.push(docType);
      } else {
        totalVerified++;
      }
    });
    
    return {
      allVerified: missingDocuments.length === 0 && unverifiedDocuments.length === 0,
      missingDocuments,
      unverifiedDocuments,
      totalRequired: requiredDocuments.length,
      totalVerified
    };
  }

  /**
   * Update seller verification status (admin)
   */
  async updateSellerVerificationStatus(
    sellerId: string, 
    statusUpdate: SellerStatusUpdate
  ): Promise<Seller> {
    const db = getDatabase();
    
    const updateData: any = {
      status: statusUpdate.status,
      overall_verification_status: statusUpdate.status,
      verification_notes: statusUpdate.verificationNotes || null,
      rejection_reason: statusUpdate.rejectionReason || null,
      updated_at: new Date()
    };
    
    if (statusUpdate.status === 'approved') {
      updateData.approved_at = new Date();
      updateData.approved_by = statusUpdate.adminId;
    }
    
    await db('sellers').where('id', sellerId).update(updateData);
    
    // Create notification for seller
    const notificationMessage = this.getStatusUpdateNotificationMessage(statusUpdate.status, statusUpdate.verificationNotes);
    await this.createSellerNotification(sellerId, {
      type: `seller_${statusUpdate.status}`,
      title: `Registration ${statusUpdate.status.charAt(0).toUpperCase() + statusUpdate.status.slice(1)}`,
      message: notificationMessage,
      data: { 
        status: statusUpdate.status, 
        notes: statusUpdate.verificationNotes,
        rejectionReason: statusUpdate.rejectionReason
      }
    });
    
    const updatedSeller = await this.getSellerById(sellerId);
    if (!updatedSeller) {
      throw new Error('Seller not found after update');
    }
    
    return updatedSeller;
  }

  /**
   * Update seller information
   */
  async updateSeller(sellerId: string, updateData: SellerUpdate): Promise<Seller> {
    const db = getDatabase();
    
    const dbUpdateData: any = {
      updated_at: new Date()
    };
    
    // Map update fields to database columns
    if (updateData.businessName !== undefined) dbUpdateData.business_name = updateData.businessName;
    if (updateData.natureOfBusiness !== undefined) dbUpdateData.nature_of_business = updateData.natureOfBusiness;
    if (updateData.primaryBusinessActivity !== undefined) dbUpdateData.primary_business_activity = updateData.primaryBusinessActivity;
    if (updateData.businessPhone !== undefined) dbUpdateData.business_phone = updateData.businessPhone;
    if (updateData.businessEmail !== undefined) dbUpdateData.business_email = updateData.businessEmail;
    if (updateData.primaryProductCategories !== undefined) dbUpdateData.primary_product_categories = updateData.primaryProductCategories;
    if (updateData.estimatedMonthlyOrderVolume !== undefined) dbUpdateData.estimated_monthly_order_volume = updateData.estimatedMonthlyOrderVolume;
    if (updateData.preferredPickupTimeSlots !== undefined) dbUpdateData.preferred_pickup_time_slots = updateData.preferredPickupTimeSlots;
    if (updateData.maxOrderProcessingTime !== undefined) dbUpdateData.max_order_processing_time = updateData.maxOrderProcessingTime;
    if (updateData.warehouseAddresses !== undefined) dbUpdateData.warehouse_addresses = db.raw('?::jsonb', [JSON.stringify(updateData.warehouseAddresses)]);
    
    await db('sellers').where('id', sellerId).update(dbUpdateData);
    
    const updatedSeller = await this.getSellerById(sellerId);
    if (!updatedSeller) {
      throw new Error('Seller not found after update');
    }
    
    return updatedSeller;
  }

  /**
   * Get status update notification message
   */
  private getStatusUpdateNotificationMessage(status: string, notes?: string): string {
    const baseMessages = {
      approved: 'Congratulations! Your seller registration has been approved. You will receive login credentials shortly.',
      rejected: 'Your seller registration has been rejected.',
      suspended: 'Your seller account has been suspended.',
      pending: 'Your seller registration is under review.'
    };
    
    let message = baseMessages[status as keyof typeof baseMessages] || 'Your registration status has been updated.';
    
    if (notes) {
      message += ` Additional notes: ${notes}`;
    }
    
    return message;
  }

  /**
   * Generate and send login credentials to approved seller
   */
  async generateAndSendCredentials(sellerId: string): Promise<void> {
    const seller = await this.getSellerById(sellerId);
    if (!seller || seller.status !== 'approved') {
      throw new Error('Seller not found or not approved');
    }

    // Generate username and temporary password
    const username = this.generateUsername(seller);
    const tempPassword = this.generateTempPassword();
    
    // Hash and store the password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const db = getDatabase();
    await db('sellers').where('id', sellerId).update({
      username: username,
      password_hash: hashedPassword,
      login_credentials_generated: true,
      credentials_sent_at: new Date(),
      updated_at: new Date()
    });

    // Send credentials via email/SMS
    await this.sendSellerCredentials(seller, username, tempPassword);
    
    // Create notification
    await this.createSellerNotification(sellerId, {
      type: 'credentials_sent',
      title: 'Login Credentials Sent',
      message: 'Your seller portal login credentials have been sent to your registered email and mobile number.',
      data: { username }
    });
  }

  /**
   * Generate unique username for seller
   */
  private generateUsername(seller: Seller): string {
    const baseName = seller.businessName || seller.fullName;
    const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${cleanName.substring(0, 8)}${randomSuffix}`;
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Send seller credentials via email/SMS
   */
  private async sendSellerCredentials(seller: Seller, username: string, tempPassword: string): Promise<void> {
    const { emailService } = await import('./email.service');
    const { smsService } = await import('./sms.service');
    
    const loginUrl = process.env.SELLER_PORTAL_URL || 'https://seller.shambit.com/login';
    
    // Send email with credentials
    await emailService.sendSellerCredentials({
      to: seller.email,
      sellerName: seller.businessName || seller.fullName,
      username,
      tempPassword,
      loginUrl
    });
    
    // Send SMS notification
    await smsService.sendCredentialsNotification({
      to: seller.mobile,
      sellerName: seller.businessName || seller.fullName,
      loginUrl
    });
  }

  /**
   * Authenticate seller with email and password
   */
  async authenticateSeller(email: string, password: string): Promise<{ seller: any }> {
    const db = getDatabase();
    const seller = await db('sellers')
      .where('email', email)
      .first();

    if (!seller || !seller.password_hash) {
      throw new Error('Invalid credentials');
    }

    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, seller.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return { seller: this.mapSellerFromDb(seller) };
  }

  /**
   * Send OTP to seller mobile for 2FA
   */
  async sendSellerOTP(mobile: string): Promise<void> {
    const { otpService } = await import('./otp.service');
    
    // Generate and store OTP with 5-minute expiry
    const otp = await otpService.generateOTP(mobile, 'seller_login', 300);
    
    // Send OTP via SMS
    const { smsService } = await import('./sms.service');
    await smsService.sendOTP({
      to: mobile,
      otp,
      purpose: 'login verification'
    });
  }

  /**
   * Verify seller OTP and generate tokens
   */
  async verifySellerOTP(sellerId: string, otp: string): Promise<{ seller: any; tokens: any }> {
    const seller = await this.getSellerById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    // Verify OTP
    const { otpService } = await import('./otp.service');
    const isValidOTP = await otpService.verifyOTP(seller.mobile, otp, 'seller_login');
    
    if (!isValidOTP) {
      throw new Error('Invalid or expired OTP');
    }

    // Update last login
    const db = getDatabase();
    await db('sellers').where('id', sellerId).update({
      last_login_at: new Date(),
      updated_at: new Date()
    });

    // Generate JWT tokens
    const tokens = await this.generateSellerTokens(seller);
    
    return { seller, tokens };
  }

  /**
   * Generate JWT tokens for seller
   */
  private async generateSellerTokens(seller: any): Promise<any> {
    const jwt = require('jsonwebtoken');
    
    const payload = {
      sub: seller.id,
      email: seller.email,
      type: 'seller',
      status: seller.status
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600
    };
  }

  /**
   * Generate CAPTCHA
   */
  async generateCaptcha(): Promise<any> {
    const { captchaService } = await import('./captcha.service');
    return await captchaService.generateCaptcha();
  }

  /**
   * Verify CAPTCHA
   */
  async verifyCaptcha(captchaId: string, captchaText: string): Promise<boolean> {
    const { captchaService } = await import('./captcha.service');
    return await captchaService.verifyCaptcha(captchaId, captchaText);
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetOTP(email: string): Promise<void> {
    const db = getDatabase();
    const seller = await db('sellers').where('email', email).first();
    
    if (!seller) {
      // Don't reveal if email exists or not - but still return success
      return;
    }

    // Generate and store OTP with 10-minute expiry
    const { otpService } = await import('./otp.service');
    const otp = await otpService.generateOTP(email, 'password_reset', 600);
    
    // Send OTP via email
    const { emailService } = await import('./email.service');
    await emailService.sendPasswordResetOTP({
      to: email,
      sellerName: seller.full_name || seller.business_name,
      otp
    });
  }

  /**
   * Reset seller password with OTP
   */
  async resetSellerPassword(email: string, otp: string, newPassword: string): Promise<void> {
    // Verify OTP
    const { otpService } = await import('./otp.service');
    const isValidOTP = await otpService.verifyOTP(email, otp, 'password_reset');
    
    if (!isValidOTP) {
      throw new Error('Invalid or expired OTP');
    }
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const db = getDatabase();
    await db('sellers')
      .where('email', email)
      .update({
        password_hash: hashedPassword,
        temp_password: false,
        updated_at: new Date()
      });
  }

  /**
   * Refresh seller token
   */
  async refreshSellerToken(refreshToken: string): Promise<any> {
    const jwt = require('jsonwebtoken');
    
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const seller = await this.getSellerById(payload.sub);
      
      if (!seller) {
        throw new Error('Seller not found');
      }

      return await this.generateSellerTokens(seller);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout seller
   */
  async logoutSeller(refreshToken: string): Promise<void> {
    const { tokenService } = await import('./token.service');
    await tokenService.blacklistToken(refreshToken);
  }

  /**
   * Get seller dashboard data
   */
  async getSellerDashboard(sellerId: string): Promise<any> {
    const db = getDatabase();
    
    // Get product counts by status
    const productStats = await db('products')
      .where('seller_id', sellerId)
      .select('verification_status')
      .count('* as count')
      .groupBy('verification_status');

    // Get total inventory value
    const inventoryValue = await db('inventory')
      .join('products', 'inventory.product_id', 'products.id')
      .where('products.seller_id', sellerId)
      .sum('inventory.total_stock * products.selling_price as total_value')
      .first();

    // Get recent orders (if order system is implemented)
    // const recentOrders = await db('orders')...

    return {
      productStats: productStats.reduce((acc: any, stat: any) => {
        acc[stat.verification_status] = parseInt(stat.count);
        return acc;
      }, {}),
      inventoryValue: inventoryValue?.total_value || 0,
      // recentOrders: [],
    };
  }

  /**
   * Create category request
   */
  async createCategoryRequest(sellerId: string, data: any): Promise<any> {
    const db = getDatabase();
    
    const [request] = await db('seller_category_requests').insert({
      seller_id: sellerId,
      category_name: data.categoryName,
      description: data.description,
      reason: data.reason,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    return request;
  }

  /**
   * Create brand request
   */
  async createBrandRequest(sellerId: string, data: any): Promise<any> {
    const db = getDatabase();
    
    const [request] = await db('seller_brand_requests').insert({
      seller_id: sellerId,
      brand_name: data.brandName,
      description: data.description,
      reason: data.reason,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    return request;
  }

  /**
   * Get seller requests
   */
  async getSellerRequests(sellerId: string, type?: string): Promise<any[]> {
    const db = getDatabase();
    
    if (type === 'category') {
      return await db('seller_category_requests')
        .where('seller_id', sellerId)
        .orderBy('created_at', 'desc');
    } else if (type === 'brand') {
      return await db('seller_brand_requests')
        .where('seller_id', sellerId)
        .orderBy('created_at', 'desc');
    } else {
      // Return both types
      const categoryRequests = await db('seller_category_requests')
        .where('seller_id', sellerId)
        .select('*', db.raw("'category' as request_type"));
      
      const brandRequests = await db('seller_brand_requests')
        .where('seller_id', sellerId)
        .select('*', db.raw("'brand' as request_type"));
      
      return [...categoryRequests, ...brandRequests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  /**
   * Get category requests (admin)
   */
  async getCategoryRequests(filters: any): Promise<any> {
    const db = getDatabase();
    
    let query = db('seller_category_requests')
      .join('sellers', 'seller_category_requests.seller_id', 'sellers.id')
      .select(
        'seller_category_requests.*',
        'sellers.full_name as seller_name',
        'sellers.email as seller_email'
      );

    if (filters.status) {
      query = query.where('seller_category_requests.status', filters.status);
    }

    const total = await query.clone().count('* as count').first();
    const requests = await query
      .orderBy('seller_category_requests.created_at', 'desc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize);

    return {
      requests,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: parseInt(total?.count as string || '0'),
        totalPages: Math.ceil(parseInt(total?.count as string || '0') / filters.pageSize)
      }
    };
  }

  /**
   * Get brand requests (admin)
   */
  async getBrandRequests(filters: any): Promise<any> {
    const db = getDatabase();
    
    let query = db('seller_brand_requests')
      .join('sellers', 'seller_brand_requests.seller_id', 'sellers.id')
      .select(
        'seller_brand_requests.*',
        'sellers.full_name as seller_name',
        'sellers.email as seller_email'
      );

    if (filters.status) {
      query = query.where('seller_brand_requests.status', filters.status);
    }

    const total = await query.clone().count('* as count').first();
    const requests = await query
      .orderBy('seller_brand_requests.created_at', 'desc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize);

    return {
      requests,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: parseInt(total?.count as string || '0'),
        totalPages: Math.ceil(parseInt(total?.count as string || '0') / filters.pageSize)
      }
    };
  }

  /**
   * Respond to category/brand request (admin)
   */
  async respondToRequest(requestId: string, action: 'approve' | 'reject', notes?: string, adminId?: string): Promise<any> {
    const db = getDatabase();
    
    // Try to find in category requests first
    let request = await db('seller_category_requests').where('id', requestId).first();
    let table = 'seller_category_requests';
    let type = 'category';
    
    if (!request) {
      request = await db('seller_brand_requests').where('id', requestId).first();
      table = 'seller_brand_requests';
      type = 'brand';
    }
    
    if (!request) {
      throw new Error('Request not found');
    }

    // Update request status
    await db(table).where('id', requestId).update({
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_notes: notes,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      updated_at: new Date()
    });

    // If approved, create the category/brand
    if (action === 'approve') {
      if (type === 'category') {
        const { categoryService } = await import('./category.service');
        await categoryService.createCategory({
          name: request.category_name,
          description: request.description,
          isActive: true
        });
      } else {
        const { brandService } = await import('./brand.service');
        await brandService.createBrand({
          name: request.brand_name,
          description: request.description,
          isActive: true
        });
      }
    }

    // Send notification to seller
    await this.createSellerNotification(request.seller_id, {
      type: `${type}_request_${action}d`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Request ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
      message: `Your ${type} request "${type === 'category' ? request.category_name : request.brand_name}" has been ${action}d.`,
      data: { requestId, type, action, notes }
    });

    return await db(table).where('id', requestId).first();
  }

  /**
   * Get seller notifications
   */
  async getSellerNotifications(sellerId: string, filters: any): Promise<any> {
    const db = getDatabase();
    
    let query = db('seller_notifications')
      .where('seller_id', sellerId);

    if (filters.unreadOnly) {
      query = query.where('is_read', false);
    }

    const total = await query.clone().count('* as count').first();
    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize);

    return {
      notifications,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: parseInt(total?.count as string || '0'),
        totalPages: Math.ceil(parseInt(total?.count as string || '0') / filters.pageSize)
      }
    };
  }

  /**
   * Create seller notification
   */
  async createSellerNotification(sellerId: string, data: any): Promise<void> {
    const db = getDatabase();
    
    await db('seller_notifications').insert({
      seller_id: sellerId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: db.raw('?::jsonb', [JSON.stringify(data.data || {})]),
      is_read: false,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(sellerId: string, notificationId: string): Promise<void> {
    const db = getDatabase();
    
    await db('seller_notifications')
      .where('id', notificationId)
      .where('seller_id', sellerId)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Map database row to Seller object
   */
  private mapSellerFromDb(row: any): Seller {
    return {
      id: row.id,
      
      // Part A: Personal Details
      fullName: row.full_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      mobile: row.mobile,
      email: row.email,
      
      // Part B: Business Information
      sellerType: row.seller_type,
      businessType: row.business_type,
      businessName: row.business_name,
      natureOfBusiness: row.nature_of_business,
      primaryBusinessActivity: row.primary_business_activity,
      yearOfEstablishment: row.year_of_establishment,
      businessPhone: row.business_phone,
      businessEmail: row.business_email,
      
      // Part C: Address Information
      registeredBusinessAddress: row.registered_business_address || null,
      warehouseAddresses: row.warehouse_addresses || [],
      
      // Part D: Tax & Compliance Details
      gstRegistered: row.gst_registered,
      gstNumber: row.gst_number,
      gstin: row.gstin,
      panNumber: row.pan_number,
      panHolderName: row.pan_holder_name,
      tdsApplicable: row.tds_applicable,
      aadhaarNumber: row.aadhaar_number,
      
      // Part E: Bank Account Details
      bankDetails: row.bank_details || null,
      
      // Part F: Document Upload Status
      documents: row.documents || {},
      
      // Operational Information
      primaryProductCategories: row.primary_product_categories,
      estimatedMonthlyOrderVolume: row.estimated_monthly_order_volume,
      preferredPickupTimeSlots: row.preferred_pickup_time_slots,
      maxOrderProcessingTime: row.max_order_processing_time,
      
      // Verification Status
      mobileVerified: row.mobile_verified || false,
      emailVerified: row.email_verified || false,
      documentsVerified: row.documents_verified || false,
      overallVerificationStatus: row.overall_verification_status || 'pending',
      
      // System Fields
      status: row.status,
      verificationNotes: row.verification_notes,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      
      // Login Credentials
      username: row.username,
      loginCredentialsGenerated: row.login_credentials_generated || false,
      credentialsSentAt: row.credentials_sent_at
    };
  }
}

export const sellerService = new SellerService();