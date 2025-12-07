# Address Management Fix

## Issue
Users were unable to save addresses. After filling out the address form and clicking "Save Address", the addresses were not being saved to the database and the address selection screen showed "No Addresses".

## Root Cause
The database schema for the `user_addresses` table was missing two important columns:
1. **`type`** - To store address type (home, work, other)
2. **`landmark`** - To store landmark information

The Android app was sending these fields in the API request, but the backend couldn't save them because the columns didn't exist in the database.

## Solution

### 1. Database Migration
Created a new migration to add the missing columns:

**File:** `packages/database/src/migrations/20251204000001_add_type_landmark_to_addresses.ts`

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_addresses', (table) => {
    table.string('type', 20).defaultTo('home'); // 'home', 'work', 'other'
    table.string('landmark', 255);
  });
}
```

### 2. Updated TypeScript Types
Updated the `UserAddress`, `CreateAddressRequest`, and `UpdateAddressRequest` interfaces to include the new fields:

**File:** `services/api/src/types/auth.types.ts`

```typescript
export interface UserAddress {
  // ... existing fields
  type: string; // 'home', 'work', 'other'
  landmark: string | null;
  // ... rest of fields
}
```

### 3. Updated Profile Service
Modified the `ProfileService` to handle the new fields:

**File:** `services/api/src/services/profile.service.ts`

- Updated `mapToAddress()` to include `type` and `landmark`
- Updated `createAddress()` to save `type` and `landmark`
- Updated `updateAddress()` to update `type` and `landmark`

### 4. UI Improvements
Previously fixed the Save button visibility issue by moving it to a fixed bottom bar in the AddEditAddressScreen.

## Changes Made

### Database
- ✅ Added `type` column to `user_addresses` table (default: 'home')
- ✅ Added `landmark` column to `user_addresses` table
- ✅ Ran migration successfully

### Backend API
- ✅ Updated TypeScript interfaces
- ✅ Updated ProfileService to handle new fields
- ✅ Rebuilt API service
- ✅ Restarted API server

### Android App
- ✅ No changes needed (already sending correct fields)
- ✅ Rebuilt APK

## Database Schema (Updated)

```sql
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'home',           -- NEW
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  landmark VARCHAR(255),                     -- NEW
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

All address endpoints now support the new fields:

### POST /api/v1/profile/addresses
Create a new address with type and landmark:

```json
{
  "type": "home",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "landmark": "Near Central Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "isDefault": true
}
```

### GET /api/v1/profile/addresses
Returns all addresses with type and landmark:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "home",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "landmark": "Near Central Park",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "isDefault": true,
      "createdAt": "2025-12-04T14:00:00.000Z",
      "updatedAt": "2025-12-04T14:00:00.000Z"
    }
  ]
}
```

## Testing

### Manual Testing Steps
1. ✅ Open the app and navigate to checkout
2. ✅ Click "Add Address"
3. ✅ Fill in all address fields including:
   - Address Type (Home/Work/Other)
   - Address Line 1 (required)
   - Address Line 2 (optional)
   - Landmark (optional)
   - City (required)
   - State (required)
   - Pincode (required)
4. ✅ Click "Save Address" button (now fixed at bottom)
5. ✅ Verify address is saved and appears in address list
6. ✅ Verify address type icon is displayed correctly
7. ✅ Verify landmark is shown if provided
8. ✅ Test editing an existing address
9. ✅ Test setting default address
10. ✅ Test deleting an address

### Database Verification
To verify addresses are being saved, run:

```sql
SELECT * FROM user_addresses ORDER BY created_at DESC;
```

## Build Status

### Backend
- ✅ Migration successful (Batch 6, 1 migration)
- ✅ TypeScript compilation successful
- ✅ API server running on port 3000

### Android App
- ✅ Build successful in 29 seconds
- 📦 APK: `mobile_app/app/build/outputs/apk/debug/app-debug.apk`
- 📏 Size: ~18.15 MB

## What's Fixed

1. **Address Saving** - Addresses now save correctly to the database
2. **Address Type** - Home/Work/Other types are now stored and displayed
3. **Landmark** - Landmark information is now saved and shown
4. **Save Button** - Always visible at the bottom of the screen
5. **Address Display** - All saved addresses appear in the selection screen
6. **Address Icons** - Correct icons shown for each address type

## Next Steps

Users can now:
- ✅ Add new delivery addresses
- ✅ Edit existing addresses
- ✅ Delete addresses
- ✅ Set default address
- ✅ Select address for checkout
- ✅ View all saved addresses with proper formatting

The address management system is now fully functional!
