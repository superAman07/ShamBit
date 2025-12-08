# Delivery Status Overview Fix

## Problem
The Delivery Status Overview dashboard was showing all zeros instead of real data from the database.

## Root Cause
The backend `getDeliveryStatusOverview` method was querying the `deliveries` table with statuses that didn't match what the frontend expected. There was a mismatch between:

**Backend was returning:**
- `pending`
- `assigned`
- `outForDelivery`
- `totalPersonnel`
- `availablePersonnel`
- `busyPersonnel`

**Frontend expected:**
- `assigned`
- `picked_up`
- `in_transit`
- `delivered`
- `failed`

Additionally, the backend was querying a `deliveries` table that may not have had the correct data structure.

## Solution
Updated the `getDeliveryStatusOverview` method in `services/api/src/services/delivery.service.ts` to:

1. **Query the `orders` table** instead of `deliveries` table
2. **Map order statuses to delivery stages** that match the frontend expectations:
   - **Assigned**: Orders with status `preparing` or `ready_for_pickup` (assigned to delivery but not yet picked up)
   - **Picked Up**: Orders with status `out_for_delivery` (picked up and in transit)
   - **In Transit**: Same as picked up (`out_for_delivery`)
   - **Delivered**: Orders with status `delivered` (only today's deliveries)
   - **Failed**: Orders with status `delivery_attempted` or `failed`

### Implementation:
```typescript
const [assignedResult, pickedUpResult, deliveredResult, failedResult] = await Promise.all([
  // Assigned: preparing or ready for pickup
  db('orders')
    .whereIn('status', ['preparing', 'ready_for_pickup'])
    .count('* as count')
    .first(),
  
  // Picked Up / In Transit: out for delivery
  db('orders')
    .where('status', 'out_for_delivery')
    .count('* as count')
    .first(),
  
  // Delivered (today only)
  db('orders')
    .where('status', 'delivered')
    .whereRaw('DATE(delivered_at) = CURRENT_DATE')
    .count('* as count')
    .first(),
  
  // Failed: delivery attempted or failed
  db('orders')
    .whereIn('status', ['delivery_attempted', 'failed'])
    .count('* as count')
    .first(),
]);
```

## Benefits
- ✅ Shows real data from the database
- ✅ Correctly maps order statuses to delivery stages
- ✅ Matches frontend expectations
- ✅ Provides accurate delivery metrics for dashboard
- ✅ Only shows today's delivered orders for relevance
- ✅ Includes failed deliveries for visibility

## Dashboard Display
The dashboard now shows:
- **Assigned**: Orders ready to be picked up by delivery personnel
- **Picked Up**: Orders currently being delivered
- **In Transit**: Same as picked up (visual representation)
- **Delivered**: Successfully delivered orders (today)
- **Failed**: Failed delivery attempts
- **Active**: Total of Assigned + Picked Up + In Transit

## Testing
After this fix, the Delivery Status Overview should display real counts based on actual order statuses in the database.
