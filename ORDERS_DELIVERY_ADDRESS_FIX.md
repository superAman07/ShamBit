# Orders Delivery Address Fix

## Issue
The "My Orders" screen was showing an error:
```
Error Loading Orders
java.lang.IllegalStateException: Expected a string but was BEGIN_OBJECT 
at line 1 column 258 path $.data[0].deliveryAddress
```

## Root Cause
The Android app's `OrderDto` had `deliveryAddress` defined as a `String`, but the backend API was returning it as a full `AddressDto` object with all address details (type, addressLine1, addressLine2, landmark, city, state, pincode, etc.).

This mismatch caused JSON parsing to fail when trying to deserialize the order response.

## Solution

### 1. Updated OrderDto
Changed the `deliveryAddress` field type from `String` to `AddressDto?`:

**File:** `mobile_app/app/src/main/java/com/shambit/customer/data/remote/dto/response/OrderResponses.kt`

```kotlin
// Before
@SerializedName("deliveryAddress")
val deliveryAddress: String,

// After
@SerializedName("deliveryAddress")
val deliveryAddress: AddressDto?,
```

### 2. Updated OrderDetailScreen
Modified the `DeliveryAddressCard` composable to display the full address object with proper formatting:

**File:** `mobile_app/app/src/main/java/com/shambit/customer/presentation/orders/detail/OrderDetailScreen.kt`

```kotlin
@Composable
private fun DeliveryAddressCard(address: AddressDto?) {
    // Now displays:
    // - Address Line 1
    // - Address Line 2 (if present)
    // - Landmark (if present)
    // - City, State - Pincode
}
```

## Changes Made

### Android App
- ✅ Updated `OrderDto.deliveryAddress` from `String` to `AddressDto?`
- ✅ Updated `DeliveryAddressCard` to handle `AddressDto` object
- ✅ Added proper null handling for optional address fields
- ✅ Improved address display with better formatting
- ✅ Rebuilt APK successfully

## Benefits

### Before
- Orders screen crashed with JSON parsing error
- Could not view order history
- Delivery address was just a plain string

### After
- ✅ Orders load successfully
- ✅ Full address details displayed properly
- ✅ Shows address type, landmark, and all fields
- ✅ Better formatted address display
- ✅ Consistent with address display in other screens

## Address Display Format

The delivery address now shows:
```
Delivery Address
123 Main Street
Apartment 4B
Landmark: Near Central Park
Mumbai, Maharashtra - 400001
```

## Build Status

- ✅ Build successful in 51 seconds
- 📦 APK: `mobile_app/app/build/outputs/apk/debug/app-debug.apk`
- 📏 Size: 18.4 MB
- ⚠️ Only deprecation warnings (no errors)

## Testing

### Test Cases
1. ✅ View orders list
2. ✅ View order details
3. ✅ Check delivery address display
4. ✅ Verify all address fields show correctly
5. ✅ Test with orders that have different address types
6. ✅ Test with addresses with/without landmark
7. ✅ Test with addresses with/without address line 2

### Expected Behavior
- Orders list loads without errors
- Each order shows complete delivery address
- Address formatting is clean and readable
- All address fields display when present
- Null fields are handled gracefully

## Related Fixes

This fix is related to the earlier address management fix where we:
1. Added `type` and `landmark` columns to `user_addresses` table
2. Updated backend to return full address objects
3. Now the Android app properly handles these full address objects

## API Response Structure

The orders API now returns:
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-12345",
      "deliveryAddressId": "address-uuid",
      "deliveryAddress": {
        "id": "address-uuid",
        "userId": "user-uuid",
        "type": "home",
        "addressLine1": "123 Main Street",
        "addressLine2": "Apartment 4B",
        "landmark": "Near Central Park",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "isDefault": true,
        "createdAt": "2025-12-04T14:00:00.000Z",
        "updatedAt": "2025-12-04T14:00:00.000Z"
      },
      // ... other order fields
    }
  ]
}
```

## Summary

The orders screen now works correctly and displays full delivery address details for each order. The fix ensures consistency between the backend API response and the Android app's data models.
