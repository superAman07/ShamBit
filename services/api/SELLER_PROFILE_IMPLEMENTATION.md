# Seller Profile Endpoint Implementation

## Overview
Implemented the `GET /api/seller/profile` endpoint to match the frontend requirements exactly.

## Files Created/Modified

### 1. `services/api/src/routes/seller.routes.ts` (NEW)
- Main seller profile endpoint implementation
- Handles authentication via JWT middleware
- Maps database fields to frontend-friendly camelCase
- Safely parses JSON fields from database
- Computes applicationStatus based on verification state
- Returns exactly the structure expected by frontend
- Added debugging endpoints: `/api/seller/test` and `/api/seller/auth-test`

### 2. `services/api/src/routes/index.ts` (MODIFIED)
- Added seller routes import and mounting at `/seller`

### 3. `services/api/src/app.ts` (MODIFIED)
- Added seller routes import
- Mounted seller routes at `/api/seller` (matches frontend expectations)
- Both legacy simple-routes and new v1 structure supported

### 4. `services/api/src/middleware/auth.ts` (MODIFIED)
- Fixed seller ID type from `number` to `string` to support UUID

## API Endpoints

### GET /api/seller/test
**Authentication:** Not required
**Purpose:** Test basic routing

### GET /api/seller/auth-test  
**Authentication:** Required (JWT Bearer token)
**Purpose:** Test authentication middleware

### GET /api/seller/profile
**Authentication:** Required (JWT Bearer token)
**Purpose:** Get seller profile data

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "seller": {
      "fullName": "string",
      "mobile": "string", 
      "email": "string",
      "mobileVerified": "boolean",
      "emailVerified": "boolean",
      "applicationStatus": "incomplete|submitted|clarification_needed|approved|rejected",
      "businessDetails": {
        "businessName": "string",
        "businessType": "string",
        "natureOfBusiness": "string", 
        "yearOfEstablishment": "number",
        "primaryProductCategories": "string"
      },
      "taxCompliance": {
        "panNumber": "string",
        "panHolderName": "string",
        "gstRegistered": "boolean",
        "gstNumber": "string",
        "aadhaarNumber": "string",
        "gstExempt": "boolean",
        "exemptionReason": "string"
      },
      "bankDetails": {
        "accountHolderName": "string",
        "bankName": "string", 
        "accountNumber": "string",
        "ifscCode": "string",
        "accountType": "savings|current",
        "verificationStatus": "pending|verified|rejected"
      },
      "documents": [
        {
          "id": "string",
          "type": "string",
          "fileName": "string",
          "uploadedAt": "string",
          "verificationStatus": "string"
        }
      ],
      "addressInfo": {
        "registeredAddress": {
          "line1": "string",
          "line2": "string", 
          "city": "string",
          "state": "string",
          "pincode": "string",
          "country": "India"
        }
      },
      "rejectionReason": "string",
      "clarificationRequests": ["string"]
    }
  },
  "meta": {
    "timestamp": "string"
  }
}
```

## Database Mapping

The endpoint maps database fields to frontend expectations:

- `full_name` → `fullName`
- `mobile_verified` → `mobileVerified` 
- `email_verified` → `emailVerified`
- `overall_verification_status` + `profile_completed` → `applicationStatus`
- JSON fields parsed safely with error handling
- Handles both snake_case and camelCase in JSON fields

## Application Status Logic

```typescript
function mapVerificationStatusToApplicationStatus(
  verificationStatus: string, 
  profileCompleted: boolean
): 'incomplete' | 'submitted' | 'clarification_needed' | 'approved' | 'rejected' {
  if (!profileCompleted) return 'incomplete';
  
  switch (verificationStatus) {
    case 'pending': return 'incomplete';
    case 'in_review': return 'submitted'; 
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    default: return 'incomplete';
  }
}
```

## Error Handling

- **401**: Unauthenticated (handled by auth middleware)
- **404**: Seller not found
- **500**: Unexpected errors (database, JSON parsing, etc.)

## Debugging Features

- Console logging for seller ID and database queries
- Detailed error logging with stack traces
- Graceful handling of missing database fields
- Test endpoints for routing and authentication verification

## Security Features

- JWT authentication required
- No password hashes exposed
- No internal audit fields exposed
- Safe JSON parsing with error handling
- Proper error responses

## Testing

Use the provided test script:
```bash
node services/api/test-seller-profile.js
```

Or test manually:
```bash
# Test basic routing
curl http://localhost:3000/api/seller/test

# Test authentication requirement
curl http://localhost:3000/api/seller/profile

# Test with token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/seller/profile
```

## Troubleshooting 500 Errors

The implementation includes extensive debugging:

1. **Database Connection**: Logs database query results
2. **Authentication**: Separate auth test endpoint
3. **Field Mapping**: Graceful handling of missing fields
4. **JSON Parsing**: Safe parsing with error handling
5. **Error Details**: Full error logging with stack traces

## Frontend Integration

The endpoint now works with the existing frontend code:

```typescript
const response = await sellerApi.getProfile() as { seller: SellerProfile };
setSeller(response.seller);
```

No frontend changes required - the dashboard will load without 404 errors.

## Example Response

See `services/api/example-seller-profile-response.json` for a complete example response that matches the frontend expectations.