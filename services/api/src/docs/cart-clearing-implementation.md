# Cart Clearing Implementation

## Overview

This document describes the implementation of automatic cart clearing after successful order creation, as specified in the Cart Management System requirements (Requirements 5.1, 5.2).

## Implementation Details

### 1. COD (Cash on Delivery) Orders

**Location**: `services/api/src/services/order.service.ts` - `createOrder()` method

**Flow**:
1. Order is created with status `confirmed`
2. Inventory is committed immediately
3. Promotion usage is recorded (if applicable)
4. **Cart items are cleared** from `cart_items` table
5. **Applied promo code is cleared** from `cart_promo_codes` table
6. Transaction is committed
7. Success log is written

**Code**:
```typescript
// Clear cart after successful COD order
await trx('cart_items')
  .where('user_id', userId)
  .delete();

// Clear applied promo code from cart
await trx('cart_promo_codes')
  .where('user_id', userId)
  .delete();

await trx.commit();

logger.info('Cart cleared after COD order', {
  orderId: order.id,
  userId,
});
```

### 2. Online Payment Orders

**Location**: `services/api/src/services/order.service.ts` - `handlePaymentSuccess()` method

**Flow**:
1. Payment signature is verified
2. Order status is updated to `confirmed`
3. Payment status is updated to `completed`
4. Inventory reservations are committed
5. Promotion usage is recorded (if applicable)
6. **Cart items are cleared** from `cart_items` table
7. **Applied promo code is cleared** from `cart_promo_codes` table
8. Transaction is committed
9. Success log is written
10. Notifications are sent

**Code**:
```typescript
// Clear cart after successful online payment
await trx('cart_items')
  .where('user_id', order.user_id)
  .delete();

// Clear applied promo code from cart
await trx('cart_promo_codes')
  .where('user_id', order.user_id)
  .delete();

await trx.commit();

logger.info('Cart cleared after successful payment', {
  orderId: order.id,
  userId: order.user_id,
});
```

## Transaction Safety

Both implementations use database transactions (`trx`) to ensure atomicity:

- If any step fails, the entire transaction is rolled back
- Cart is only cleared if the order is successfully created/confirmed
- No partial state is possible

## What Gets Cleared

1. **Cart Items** (`cart_items` table):
   - All items in the user's cart are deleted
   - Uses `user_id` to ensure only the user's cart is affected

2. **Applied Promo Code** (`cart_promo_codes` table):
   - Any promo code applied to the cart is removed
   - Prevents reuse of the same promo code on the next order

## Requirements Satisfied

✅ **Requirement 5.1**: Cart items are maintained until converted to an order
- Cart persists across sessions until order is created
- Cart is only cleared after successful order creation

✅ **Requirement 5.2**: Cart items are retrieved when customer logs in
- Cart remains in database until explicitly cleared by order creation
- Customer can continue shopping across sessions

## Testing

### Manual Testing Steps

1. **COD Order Test**:
   ```
   1. Add items to cart
   2. Apply promo code (optional)
   3. Create COD order
   4. Verify cart is empty
   5. Verify promo code is removed
   ```

2. **Online Payment Test**:
   ```
   1. Add items to cart
   2. Apply promo code (optional)
   3. Create online payment order
   4. Complete payment (trigger webhook)
   5. Verify cart is empty
   6. Verify promo code is removed
   ```

### Test Script

A manual test script is available at:
`services/api/src/scripts/test-cart-clearing.ts`

Run with:
```bash
npx ts-node services/api/src/scripts/test-cart-clearing.ts
```

## Logging

Both implementations include logging for debugging and monitoring:

- **COD**: `"Cart cleared after COD order"`
- **Online Payment**: `"Cart cleared after successful payment"`

Logs include:
- `orderId`: The order that triggered cart clearing
- `userId`: The user whose cart was cleared

## Error Handling

Cart clearing is part of the transaction:
- If cart clearing fails, the entire order creation/payment processing is rolled back
- This ensures data consistency
- Errors are logged and propagated to the caller

## Database Schema

### cart_items
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  added_price INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### cart_promo_codes
```sql
CREATE TABLE cart_promo_codes (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  promo_code VARCHAR(50) NOT NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  max_discount_amount INTEGER,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Future Considerations

1. **Soft Delete**: Consider soft-deleting cart items instead of hard delete for analytics
2. **Cart History**: Track cart-to-order conversion for business intelligence
3. **Abandoned Cart**: Implement abandoned cart recovery (requires NOT clearing cart on order failure)

## Related Files

- `services/api/src/services/order.service.ts` - Order creation and payment handling
- `services/api/src/services/cart.service.ts` - Cart management operations
- `packages/database/src/migrations/20251114000005_create_cart_tables.ts` - Cart tables schema
- `.kiro/specs/cart-management/requirements.md` - Cart management requirements
- `.kiro/specs/cart-management/design.md` - Cart management design
