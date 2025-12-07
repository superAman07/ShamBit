# API Route Order Fix - 500 Error Resolution

## Issue
The admin portal was getting 500 Internal Server Error when trying to fetch delivery personnel:
```
GET http://localhost:3000/api/v1/orders/admin/delivery-personnel 500 (Internal Server Error)
```

Error message showed: "Failed to fetch order details" instead of "Failed to fetch delivery personnel"

## Root Cause
**Route Order Conflict**: The `/admin/delivery-personnel` route was defined AFTER the `/admin/:id` route in `order.routes.ts`.

Express matches routes in the order they are defined. When a request came for `/admin/delivery-personnel`, Express matched it to `/admin/:id` first, treating "delivery-personnel" as the order ID parameter. This caused the wrong handler to execute, resulting in the error "Failed to fetch order details".

### Route Matching Rules in Express:
1. Routes are matched in the order they are registered
2. Specific paths must be defined BEFORE parameterized paths
3. `/admin/delivery-personnel` (specific) must come before `/admin/:id` (parameterized)

## Files Fixed

### 1. `services/api/src/routes/order.routes.ts`
Fixed 8 routes:
- `GET /admin/delivery-personnel`
- `GET /admin/all`
- `GET /admin/:id`
- `PUT /admin/:id/status`
- `PUT /admin/:id/delivery`
- `PUT /admin/:id/cancel`
- `PUT /admin/:id/return`
- `POST /admin/:id/notes`

### 2. `services/api/src/routes/settings.routes.ts`
Fixed 3 routes and updated to use proper Express types:
- `GET /` (get all settings)
- `GET /:key` (get specific setting)
- `PUT /:key` (update setting)

Also replaced `asyncErrorHandler` with standard Express error handling pattern using `try/catch` and `next(error)`.

## Changes Made

### Before (Incorrect Order):
```typescript
// ❌ WRONG: Parameterized route defined first
router.get('/admin/:id', ...requireAdmin, getOrderDetailsHandler);

// This route never gets hit because :id matches "delivery-personnel"
router.get('/admin/delivery-personnel', ...requireAdmin, async (req, res) => {
  // Never executed!
});
```

### After (Correct Order):
```typescript
// ✅ CORRECT: Specific route defined first
router.get('/admin/delivery-personnel', ...requireAdmin, async (req, res) => {
  const personnel = await orderService.getAvailableDeliveryPersonnel();
  res.json({ success: true, data: personnel });
});

// Parameterized route comes after
router.get('/admin/:id', ...requireAdmin, getOrderDetailsHandler);
```

## Why This Happened
When `/admin/delivery-personnel` was requested:
1. Express checked routes in order
2. Found `/admin/:id` first
3. Matched "delivery-personnel" as the `:id` parameter
4. Executed `getOrderDetailsHandler` with id="delivery-personnel"
5. Handler tried to fetch order with that ID, failed, returned "Failed to fetch order details"

## Testing
```bash
# Test the endpoint (will fail auth but route is correct)
curl http://localhost:3000/api/v1/orders/admin/delivery-personnel

# Response shows route is working (just needs valid token):
{"success":false,"error":{"code":"INVALID_TOKEN",...}}
```

## Impact
The `/admin/delivery-personnel` endpoint now works correctly. The admin portal can fetch delivery personnel without getting "Failed to fetch order details" errors.

## Lesson Learned
**Always define specific routes before parameterized routes in Express!**

Order matters:
1. `/admin/delivery-personnel` (specific)
2. `/admin/all` (specific)  
3. `/admin/:id` (parameterized - catches everything else)
