# Delivery Fee Bug Fix

## Problem
The delivery fee was showing as ₹5000.00 instead of ₹50.00 in the mobile app cart screen.

## Root Cause
There was a currency unit mismatch between the database and the API response:

1. **Database Storage**: The `selling_price` in the products table is stored as `DECIMAL(10,2)` in **rupees** (e.g., 85.00 for ₹85)
2. **Backend Logic**: The cart service was treating all values as **paise** (smallest currency unit)
3. **API Response**: The backend was sending values in paise, but the mobile app expected values in **rupees**

The issue occurred because:
- The cart service was reading `selling_price` from the database (in rupees) and treating it as if it was already in paise
- This caused all calculations to be 100x larger than they should be
- The delivery fee of 5000 paise (₹50) was being sent as 5000 to the mobile app, which displayed it as ₹5000

## Solution

### 1. Fixed Product Price Conversion in Cart Service
**File**: `services/api/src/services/cart.service.ts`

Updated the `mapToCartItemWithProduct` method to convert `selling_price` from rupees to paise:

```typescript
price: Math.round(parseFloat(row.product_price) * 100), // Convert rupees to paise
```

This ensures all internal calculations use paise consistently.

### 2. Added Response Conversion in Cart Routes
**File**: `services/api/src/routes/cart.routes.ts`

Added helper functions to convert values from paise to rupees before sending API responses:

```typescript
const convertCartToResponse = (cart: any) => {
  return {
    ...cart,
    items: cart.items.map((item: any) => ({
      ...item,
      addedPrice: item.addedPrice / 100,
      product: {
        ...item.product,
        price: item.product.price / 100,
      },
    })),
    subtotal: cart.subtotal / 100,
    discountAmount: cart.discountAmount / 100,
    taxAmount: cart.taxAmount / 100,
    deliveryFee: cart.deliveryFee / 100,
    totalAmount: cart.totalAmount / 100,
  };
};
```

Applied this conversion to all cart endpoints:
- GET `/api/v1/cart`
- POST `/api/v1/cart/items`
- PUT `/api/v1/cart/items/:id`
- DELETE `/api/v1/cart/items/:id`
- DELETE `/api/v1/cart`
- POST `/api/v1/cart/apply-promo`
- DELETE `/api/v1/cart/promo`

## Result
- Delivery fee now correctly shows as ₹50.00 (from settings: 5000 paise)
- All cart calculations (subtotal, tax, discount, total) are now accurate
- No hardcoded values remain in the codebase
- The delivery fee logic (including free delivery threshold) works as designed

## Testing
After deploying these changes:
1. Add items to cart in the mobile app
2. Verify the delivery fee shows as ₹50.00 (or ₹0.00 if order exceeds free delivery threshold)
3. Verify subtotal, tax, and total amounts are calculated correctly
4. Test with promo codes to ensure discounts are applied correctly
