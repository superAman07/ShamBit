# Comprehensive Seller Registration API Documentation

## Overview
Complete API implementation for the ShamBit seller registration, verification, and portal management workflow supporting all fields from the comprehensive seller onboarding process.

## API Endpoints

### 1. Seller Registration & Verification

#### POST /api/v1/sellers/register
**Description**: Register a new seller with comprehensive details including all personal, business, address, tax, and bank information  
**Access**: Public  
**Request Body**: Complete seller registration data with all required fields:

```json
{
  // Part A: Personal Details
  "fullName": "Priya Sharma",
  "dateOfBirth": "1985-06-15",
  "gender": "female",
  "mobile": "9876543211",
  "email": "priya@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  
  // Part B: Business Information
  "sellerType": "business",
  "businessType": "proprietorship",
  "businessName": "Green Grocers Delhi",
  "natureOfBusiness": "Fresh fruits and vegetables wholesale",
  "primaryBusinessActivity": "Grocery sales",
  "yearOfEstablishment": 2018,
  "businessPhone": "9876543212",
  "businessEmail": "business@example.com",
  
  // Part C: Address Information
  "registeredBusinessAddress": {
    "addressLine1": "Shop No. 15, Green Market Complex",
    "addressLine2": "Sector 18, Noida",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pinCode": "201301"
  },
  "warehouseAddresses": [
    {
      "isPrimary": true,
      "sameAsRegistered": false,
      "addressLine1": "Warehouse A, Industrial Area",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pinCode": "201301",
      "contactPerson": "Raj Kumar",
      "contactPhone": "9876543213",
      "operatingHours": "6:00 AM - 10:00 PM",
      "maxDeliveryRadius": 15
    }
  ],
  
  // Part D: Tax & Compliance Details
  "gstRegistered": true,
  "gstNumber": "09ABCDE1234F1Z5",
  "gstin": "09ABCDE1234F1Z5",
  "panNumber": "ABCDE1234F",
  "panHolderName": "Priya Sharma",
  "tdsApplicable": false,
  "aadhaarNumber": "123456789012",
  
  // Part E: Bank Account Details
  "bankDetails": {
    "accountHolderName": "Priya Sharma",
    "bankName": "State Bank of India",
    "accountNumber": "1234567890123456",
    "confirmAccountNumber": "1234567890123456",
    "ifscCode": "SBIN0001234",
    "accountType": "current",
    "branchName": "Noida Sector 18",
    "branchAddress": "Sector 18, Noida, UP"
  },
  
  // Operational Information
  "primaryProductCategories": "Fresh fruits, vegetables, dairy products",
  "estimatedMonthlyOrderVolume": "201-500",
  "preferredPickupTimeSlots": "6:00 AM - 8:00 AM, 6:00 PM - 8:00 PM",
  "maxOrderProcessingTime": 2,
  
  // Legal Agreements (all must be true)
  "commissionRateAccepted": true,
  "paymentSettlementTermsAccepted": true,
  "termsAndConditionsAccepted": true,
  "returnPolicyAccepted": true,
  "dataComplianceAccepted": true,
  "privacyPolicyAccepted": true
}
```

**Response**: Registration confirmation with seller ID and required documents list

#### POST /api/v1/sellers/verify-mobile
**Description**: Send OTP to mobile number for verification  
**Access**: Public  
**Request Body**: `{ "mobile": "9876543211" }`  
**Response**: OTP sent confirmation  

#### POST /api/v1/sellers/verify-mobile-otp
**Description**: Verify mobile OTP  
**Access**: Public  
**Request Body**: `{ "mobile": "9876543211", "otp": "123456" }`  
**Response**: Verification result  

#### POST /api/v1/sellers/verify-email
**Description**: Send OTP to email for verification  
**Access**: Public  
**Request Body**: `{ "email": "seller@example.com" }`  
**Response**: OTP sent confirmation  

#### POST /api/v1/sellers/verify-email-otp
**Description**: Verify email OTP  
**Access**: Public  
**Request Body**: `{ "email": "seller@example.com", "otp": "123456" }`  
**Response**: Verification result  

#### POST /api/v1/sellers/:id/documents
**Description**: Upload seller documents with comprehensive metadata  
**Access**: Public (for seller during registration)  
**Request Body**: 
```json
{
  "documentType": "panCard|aadhaarCard|passport|businessCertificate|gstCertificate|addressProof|photograph|cancelledCheque",
  "documentUrl": "https://example.com/document.jpg",
  "fileName": "document.jpg",
  "fileSize": 245760,
  "mimeType": "image/jpeg"
}
```
**Response**: Upload confirmation with document status

#### GET /api/v1/sellers/:id/documents
**Description**: Get seller document upload and verification status  
**Access**: Public (for seller) / Private (for admin)  
**Response**: Complete document status with verification details

#### PUT /api/v1/sellers/:id/documents/verify
**Description**: Verify individual seller document (admin only)  
**Access**: Private/Admin  
**Request Body**: 
```json
{
  "documentType": "panCard",
  "verified": true,
  "verificationNotes": "Document verified successfully",
  "adminId": "admin-uuid"
}
```
**Response**: Document verification result

#### PUT /api/v1/sellers/:id/verify
**Description**: Complete seller verification and approve/reject (admin only)  
**Access**: Private/Admin  
**Request Body**: 
```json
{
  "status": "approved|rejected|suspended",
  "verificationNotes": "All documents verified",
  "rejectionReason": "Reason if rejected",
  "adminId": "admin-uuid"
}
```
**Response**: Verification result  
**Note**: If approved, automatically generates and sends login credentials

#### PUT /api/v1/sellers/:id
**Description**: Update seller information (seller or admin)  
**Access**: Private  
**Request Body**: Partial seller update data (business info, addresses, etc.)  
**Response**: Updated seller information  

### 2. Seller Authentication

#### POST /api/v1/seller-auth/login
**Description**: Seller login with email, password, and CAPTCHA  
**Access**: Public  
**Request Body**: `{ email: string, password: string, captcha: string }`  
**Response**: OTP sent confirmation (requires 2FA)  

#### POST /api/v1/seller-auth/verify-otp
**Description**: Complete login with OTP verification  
**Access**: Public  
**Request Body**: `{ sellerId: string, otp: string }`  
**Response**: JWT tokens and seller profile  

#### GET /api/v1/seller-auth/captcha
**Description**: Generate CAPTCHA for login  
**Access**: Public  
**Response**: CAPTCHA image and ID  

#### POST /api/v1/seller-auth/forgot-password
**Description**: Send password reset OTP  
**Access**: Public  
**Request Body**: `{ email: string }`  
**Response**: OTP sent confirmation  

#### POST /api/v1/seller-auth/reset-password
**Description**: Reset password with OTP  
**Access**: Public  
**Request Body**: `{ email: string, otp: string, newPassword: string }`  
**Response**: Password reset confirmation  

#### POST /api/v1/seller-auth/refresh-token
**Description**: Refresh access token  
**Access**: Public  
**Request Body**: `{ refreshToken: string }`  
**Response**: New JWT tokens  

#### POST /api/v1/seller-auth/logout
**Description**: Logout seller  
**Access**: Private  
**Response**: Logout confirmation  

#### GET /api/v1/seller-auth/me
**Description**: Get current seller profile  
**Access**: Private  
**Response**: Seller profile data  

### 3. Seller Portal - Dashboard

#### GET /api/v1/seller-portal/dashboard
**Description**: Get seller dashboard data  
**Access**: Private (Seller)  
**Response**: Dashboard statistics and metrics  

### 4. Seller Portal - Product Management

#### GET /api/v1/seller-portal/products
**Description**: Get seller's products with pagination  
**Access**: Private (Seller)  
**Query Params**: `page`, `pageSize`, `search`, `status`, `isActive`  
**Response**: Paginated product list  

#### POST /api/v1/seller-portal/products
**Description**: Create new product  
**Access**: Private (Seller)  
**Request Body**: Product creation data  
**Response**: Created product (status: pending)  
**Note**: Products start as pending verification, inactive, and not sellable  

#### GET /api/v1/seller-portal/products/:id
**Description**: Get seller's product by ID  
**Access**: Private (Seller)  
**Response**: Product details  

#### PUT /api/v1/seller-portal/products/:id
**Description**: Update seller's product  
**Access**: Private (Seller)  
**Request Body**: Product update data  
**Response**: Updated product  
**Note**: Resets verification status to pending if previously rejected/hold  

#### POST /api/v1/seller-portal/products/:id/images
**Description**: Upload product images  
**Access**: Private (Seller)  
**Request Body**: `{ imageUrls: string[] }`  
**Response**: Updated product with images  

### 5. Seller Portal - Inventory Management

#### GET /api/v1/seller-portal/inventory
**Description**: Get seller's inventory  
**Access**: Private (Seller)  
**Query Params**: `page`, `pageSize`, `search`, `stockLevel`  
**Response**: Paginated inventory list  

#### PUT /api/v1/seller-portal/inventory/:productId
**Description**: Update product inventory  
**Access**: Private (Seller)  
**Request Body**: `{ totalStock?: number, thresholdStock?: number }`  
**Response**: Updated inventory  

### 6. Seller Portal - Categories & Brands

#### GET /api/v1/seller-portal/categories
**Description**: Get available categories (read-only)  
**Access**: Private (Seller)  
**Response**: Active categories list  

#### GET /api/v1/seller-portal/brands
**Description**: Get available brands (read-only)  
**Access**: Private (Seller)  
**Response**: Active brands list  

#### POST /api/v1/seller-portal/category-request
**Description**: Request new category creation  
**Access**: Private (Seller)  
**Request Body**: `{ categoryName: string, description?: string, reason: string }`  
**Response**: Request created (pending admin approval)  

#### POST /api/v1/seller-portal/brand-request
**Description**: Request new brand creation  
**Access**: Private (Seller)  
**Request Body**: `{ brandName: string, description?: string, reason: string }`  
**Response**: Request created (pending admin approval)  

#### GET /api/v1/seller-portal/requests
**Description**: Get seller's category/brand requests  
**Access**: Private (Seller)  
**Query Params**: `type` ('category'|'brand')  
**Response**: Request history  

### 7. Seller Portal - Notifications

#### GET /api/v1/seller-portal/notifications
**Description**: Get seller notifications  
**Access**: Private (Seller)  
**Query Params**: `page`, `pageSize`, `unreadOnly`  
**Response**: Paginated notifications  

#### PUT /api/v1/seller-portal/notifications/:id/read
**Description**: Mark notification as read  
**Access**: Private (Seller)  
**Response**: Success confirmation  

### 8. Admin - Product Verification

#### GET /api/v1/sellers/:id/products
**Description**: Get products by seller (admin view)  
**Access**: Private/Admin  
**Query Params**: `page`, `pageSize`, `verificationStatus`  
**Response**: Seller's products with verification details  

#### PUT /api/v1/sellers/products/:productId/verify
**Description**: Verify seller product  
**Access**: Private/Admin  
**Request Body**: `{ action: 'approve'|'reject'|'hold', notes?: string, adminId?: string }`  
**Response**: Verification result  
**Note**: Approved products become active and sellable  

#### GET /api/v1/sellers/products/pending
**Description**: Get all pending products for verification  
**Access**: Private/Admin  
**Query Params**: `page`, `pageSize`  
**Response**: Paginated pending products list  

#### PUT /api/v1/sellers/products/:productId/featured
**Description**: Toggle product featured status (admin only)  
**Access**: Private/Admin  
**Request Body**: `{ isFeatured: boolean }`  
**Response**: Updated product  

### 9. Admin - Category/Brand Requests

#### GET /api/v1/sellers/requests/category
**Description**: Get category creation requests  
**Access**: Private/Admin  
**Query Params**: `page`, `pageSize`, `status`  
**Response**: Paginated category requests  

#### GET /api/v1/sellers/requests/brand
**Description**: Get brand creation requests  
**Access**: Private/Admin  
**Query Params**: `page`, `pageSize`, `status`  
**Response**: Paginated brand requests  

#### PUT /api/v1/sellers/requests/:requestId/respond
**Description**: Respond to category/brand request  
**Access**: Private/Admin  
**Request Body**: `{ action: 'approve'|'reject', notes?: string, adminId?: string }`  
**Response**: Response result  
**Note**: If approved, automatically creates the category/brand  

## Complete Seller Onboarding Workflow

### A. Seller Registration & Verification Process

#### Phase 1: Initial Registration
1. **Seller Registration**: `POST /sellers/register` with comprehensive details including:
   - Personal details (name, DOB, gender, contact info)
   - Business information (type, name, nature, establishment year)
   - Address information (registered address + warehouse addresses)
   - Tax & compliance details (GST, PAN, Aadhaar)
   - Bank account details for payouts
   - Operational preferences (categories, order volume, processing time)
   - Legal agreement acceptances

#### Phase 2: Contact Verification
2. **Mobile Verification**: 
   - `POST /sellers/verify-mobile` - Send OTP to mobile
   - `POST /sellers/verify-mobile-otp` - Verify mobile with OTP
3. **Email Verification**:
   - `POST /sellers/verify-email` - Send OTP to email
   - `POST /sellers/verify-email-otp` - Verify email with OTP

#### Phase 3: Document Upload
4. **Document Upload**: `POST /sellers/:id/documents` for each required document:
   - **Always Required**: PAN Card, Aadhaar Card, Address Proof, Photograph, Cancelled Cheque
   - **Business Sellers**: Business Registration Certificate
   - **GST Registered**: GST Certificate
   - **Optional**: Passport (alternative to Aadhaar)

#### Phase 4: Admin Review & Verification
5. **Document Verification**: Admin reviews each document individually
   - `PUT /sellers/:id/documents/verify` - Verify/reject individual documents
   - System tracks verification status of each document type
6. **Complete Verification**: Once all documents verified
   - `PUT /sellers/:id/verify` - Final approval/rejection decision
   - System checks all required documents are verified before allowing approval

#### Phase 5: Credential Generation & Access
7. **Credential Generation**: If approved, system automatically:
   - Generates unique username and temporary password
   - Sends credentials via email and SMS
   - Creates seller portal access
   - Sends welcome notification

### B. Document Requirements by Seller Type

#### Individual Sellers
- PAN Card ✓
- Aadhaar Card ✓
- Address Proof ✓
- Photograph ✓
- Cancelled Cheque ✓

#### Business Sellers (Additional)
- Business Registration Certificate ✓
- GST Certificate (if GST registered) ✓

### C. Verification Status Flow

#### Document Level Status
- **uploaded**: false → true (when document uploaded)
- **verified**: false → true/false (admin verification)

#### Seller Level Status
- **pending**: Initial registration
- **in_review**: All documents uploaded and under admin review
- **approved**: All documents verified and seller approved
- **rejected**: Seller rejected by admin
- **suspended**: Seller account suspended

### D. Address Management for Hyperlocal Delivery

#### Registered Business Address
- Single registered address for legal/tax purposes
- Used for official correspondence

#### Warehouse/Pickup Addresses (Multiple Allowed)
- Support for multiple pickup locations
- Each address includes:
  - Contact person and phone
  - Operating hours
  - Maximum delivery radius (for hyperlocal)
  - Primary address designation

### B. Seller Portal Access
1. **Login**: `POST /seller-auth/login` with email, password, CAPTCHA
2. **2FA**: `POST /seller-auth/verify-otp` to complete login
3. **Portal Access**: Seller can access dashboard and manage products

### C. Product Management
1. **Create Product**: `POST /seller-portal/products` (starts as pending)
2. **Upload Images**: `POST /seller-portal/products/:id/images`
3. **Admin Verification**: `PUT /sellers/products/:productId/verify`
4. **Product Visibility**: Approved products become visible to customers

### D. Inventory Management
1. **View Inventory**: `GET /seller-portal/inventory`
2. **Update Stock**: `PUT /seller-portal/inventory/:productId`
3. **Admin Overview**: Admin can view all seller inventories

### E. Category/Brand Management
1. **View Available**: `GET /seller-portal/categories` and `/brands`
2. **Request New**: `POST /seller-portal/category-request` or `/brand-request`
3. **Admin Review**: `PUT /sellers/requests/:requestId/respond`
4. **Auto-Creation**: Approved requests automatically create category/brand

## Access Control

### Seller Access Control
- Each seller can only view and manage their own data
- Products are associated with seller_id
- Inventory updates restricted to seller's own products
- Category/brand requests tracked by seller

### Admin Access Control
- Admin can view cumulative data from all sellers
- Admin has exclusive rights to:
  - Verify seller registrations
  - Approve/reject products
  - Mark products as featured
  - Approve category/brand requests
  - View all seller statistics

## Product Status Flow

### Verification Status
- **pending**: Newly created, awaiting admin review
- **approved**: Admin approved, visible to customers
- **rejected**: Admin rejected, not visible
- **hold**: Admin put on hold, needs more information

### Product Controls
- **isActive**: Active/Inactive (admin controlled after approval)
- **isSellable**: Can be purchased (admin controlled)
- **isFeatured**: Featured product (admin only)
- **seller_id**: Every product must be associated with a seller

## Security Features

### Authentication
- Multi-factor authentication (password + OTP + CAPTCHA)
- JWT tokens with refresh mechanism
- Secure password reset with OTP verification

### Authorization
- Role-based access control (seller vs admin)
- Resource ownership validation
- API rate limiting

### Data Protection
- Sensitive data masking in responses
- Document upload validation
- Input sanitization and validation

## Database Schema Updates

The migration script creates/updates:
- Enhanced sellers table with comprehensive fields
- seller_category_requests table
- seller_brand_requests table  
- seller_notifications table
- products table with seller_id and verification fields
- Proper indexes for performance
- Constraints for data integrity

## Integration Points

### Email/SMS Service
- Credential delivery after seller approval
- OTP delivery for authentication
- Password reset notifications
- Verification status updates

### File Upload Service
- Document upload during registration
- Product image uploads
- Document verification workflow

### Notification System
- Real-time notifications for sellers
- Admin alerts for pending verifications
- Status update notifications

This comprehensive API implementation provides a complete seller management workflow with proper authentication, authorization, and verification processes as specified in your requirements.