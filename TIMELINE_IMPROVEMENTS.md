# Order Timeline Improvements

## Summary
Enhanced the mobile app's order tracking timeline to display detailed order history from the backend instead of using hardcoded logic.

## Changes Made

### 1. Backend API Updates

#### `services/api/src/services/order.service.ts`
- Updated `getOrderById()` method to include timeline data for customer orders
- Timeline data is fetched from `order_history` table and mapped to `OrderHistoryEntry[]`
- Timeline is sorted chronologically (ascending order)

#### `services/api/src/types/order.types.ts`
- Added `timeline?: OrderHistoryEntry[]` field to `OrderWithItems` interface
- This allows customer order responses to include full order history

### 2. Mobile App Updates

#### `mobile_app/.../OrderResponses.kt`
- Added `OrderHistoryDto` data class to receive timeline data from API
- Added `timeline` field to `OrderDto` to store order history
- Fields include: `actionType`, `oldValue`, `newValue`, `reason`, `note`, `adminEmail`, `createdAt`

#### `mobile_app/.../OrderDetailScreen.kt`
- **New Timeline Implementation**: Uses backend timeline data when available
- **Legacy Fallback**: Maintains backward compatibility with old hardcoded logic
- **Enhanced Timeline Items**: Now display:
  - All status changes with exact timestamps
  - Reasons for cancellations/returns
  - Admin notes and actions
  - Delivery personnel assignments
  - Who performed each action (customer vs admin)

### 3. Timeline Features

#### Action Types Supported:
- `order_created` - Order placement
- `status_change` - Any status transition
- `delivery_assignment` - Delivery person assigned
- `cancellation` - Order canceled with reason
- `return` - Order returned with reason
- `note` - Admin notes added

#### Display Improvements:
- **Better Status Names**: "Out for Delivery" instead of "out_for_delivery"
- **Contextual Information**: Shows reasons, notes, and admin actions
- **Visual Hierarchy**: Completed steps shown with checkmarks
- **Chronological Order**: Events displayed from oldest to newest
- **Dynamic Height**: Timeline items adjust height based on content

### 4. Status Mapping

Added comprehensive status display names:
- `pending` → "Order Pending"
- `payment_processing` → "Processing Payment"
- `confirmed` → "Order Confirmed"
- `preparing` → "Preparing Order"
- `out_for_delivery` → "Out for Delivery"
- `delivered` → "Delivered"
- `canceled` → "Order Canceled"
- `returned` → "Order Returned"
- `failed` → "Order Failed"

## Benefits

1. **Real-Time Accuracy**: Timeline reflects actual database events, not inferred from status
2. **Transparency**: Customers see who made changes and why
3. **Better Communication**: Cancellation/return reasons are visible
4. **Admin Accountability**: Admin actions are tracked and displayed
5. **Extensibility**: Easy to add new action types in the future
6. **Backward Compatible**: Falls back to legacy logic if timeline data is unavailable

## API Response Example

```json
{
  "id": "order-123",
  "orderNumber": "ORD-2025-000001",
  "status": "delivered",
  "timeline": [
    {
      "id": "hist-1",
      "actionType": "order_created",
      "createdAt": "2025-12-05T10:00:00Z"
    },
    {
      "id": "hist-2",
      "actionType": "status_change",
      "oldValue": "pending",
      "newValue": "confirmed",
      "adminEmail": "admin@example.com",
      "createdAt": "2025-12-05T10:05:00Z"
    },
    {
      "id": "hist-3",
      "actionType": "delivery_assignment",
      "note": "Assigned to John Doe",
      "adminEmail": "admin@example.com",
      "createdAt": "2025-12-05T10:30:00Z"
    },
    {
      "id": "hist-4",
      "actionType": "status_change",
      "oldValue": "confirmed",
      "newValue": "delivered",
      "createdAt": "2025-12-05T12:00:00Z"
    }
  ]
}
```

## Testing Recommendations

1. Test with orders that have timeline data
2. Test with old orders without timeline data (fallback)
3. Test various action types (cancellation, return, notes)
4. Verify admin actions are properly attributed
5. Check timeline display with long reasons/notes
6. Test with different order statuses

## Future Enhancements

1. Add real-time updates via WebSocket/polling
2. Show delivery person location on map
3. Add estimated time for each status
4. Allow customers to add notes/feedback
5. Show delivery photos/proof of delivery
6. Add push notifications for status changes
