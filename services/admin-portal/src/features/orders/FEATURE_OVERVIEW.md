# Order Management Feature - Visual Overview

## Component Hierarchy

```
OrderListPage (Main Page)
├── DashboardLayout (Wrapper)
├── Header Section
│   ├── Title: "Order Management"
│   └── Action Buttons
│       ├── Payment Discrepancies Button
│       ├── Filters Button
│       └── Clear Filters Button (conditional)
├── Summary Cards (Grid)
│   ├── Total Orders Card
│   ├── Pending Orders Card
│   ├── In Progress Card
│   └── Delivered Today Card
├── Orders Table (Paper)
│   ├── Table Header (sortable columns)
│   │   ├── Order Number
│   │   ├── Customer
│   │   ├── Status
│   │   ├── Payment
│   │   ├── Total Amount
│   │   ├── Order Date
│   │   ├── Delivery
│   │   └── Actions
│   ├── Table Body (order rows)
│   └── Table Pagination
└── Dialogs (Modals)
    ├── OrderFiltersDialog
    ├── OrderDetailsDialog
    └── PaymentDiscrepancyDialog
```

## User Workflows

### 1. View and Filter Orders

```
User lands on Orders page
    ↓
View summary cards (total, pending, in-progress, delivered)
    ↓
View orders table with pagination
    ↓
[Optional] Click "Filters" button
    ↓
Select filter criteria (status, payment, dates, value)
    ↓
Click "Apply Filters"
    ↓
View filtered results
    ↓
[Optional] Click "Clear Filters" to reset
```

### 2. View Order Details

```
User clicks "View" icon on an order
    ↓
OrderDetailsDialog opens
    ↓
View order status stepper (visual progress)
    ↓
View customer information card
    ↓
View delivery address card
    ↓
View payment information card
    ↓
View delivery information card
    ↓
View order items table with images
    ↓
View order summary (pricing breakdown)
    ↓
View timeline (key timestamps)
    ↓
[Optional] Perform actions (see workflows below)
    ↓
Close dialog
```

### 3. Update Order Status

```
User opens order details
    ↓
Click "Update Status" button
    ↓
Status update form appears
    ↓
Select new status from dropdown (only valid transitions shown)
    ↓
[Optional] Add notes
    ↓
Click "Update Status"
    ↓
Loading indicator shown
    ↓
Success: Order updated, dialog refreshes
    OR
Error: Error message displayed
```

### 4. Assign to Delivery Personnel

```
User opens order details (confirmed or preparing status)
    ↓
Click "Assign Delivery" button
    ↓
Assignment form appears
    ↓
Select delivery personnel from dropdown
    ↓
[Optional] Set estimated delivery time
    ↓
Click "Assign"
    ↓
Loading indicator shown
    ↓
Success: Order assigned, status changes to "Out for Delivery"
    OR
Error: Error message displayed
```

### 5. Cancel Order

```
User opens order details (confirmed or preparing status)
    ↓
Click "Cancel Order" button
    ↓
Cancellation form appears
    ↓
Enter cancellation reason (required)
    ↓
Click "Confirm Cancellation"
    ↓
Loading indicator shown
    ↓
Success: Order canceled, inventory released
    OR
Error: Error message displayed
```

### 6. Process Return

```
User opens order details (delivered status)
    ↓
Click "Process Return" button
    ↓
Return form appears
    ↓
Enter return reason (required)
    ↓
Select restock option (Yes/No)
    ↓
Click "Process Return"
    ↓
Loading indicator shown
    ↓
Success: Order returned, inventory updated if restocked
    OR
Error: Error message displayed
```

### 7. Review Payment Discrepancies

```
User clicks "Payment Discrepancies" button
    ↓
PaymentDiscrepancyDialog opens
    ↓
View discrepancies table
    ↓
[Optional] Filter by status (pending, resolved, ignored, all)
    ↓
For each pending discrepancy:
    ├── Click "Resolve" button
    │   ↓
    │   [Optional] Add notes
    │   ↓
    │   Click "Confirm Resolve"
    │   ↓
    │   Discrepancy marked as resolved
    │
    OR
    │
    └── Click "Ignore" button
        ↓
        [Optional] Add notes
        ↓
        Click "Confirm Ignore"
        ↓
        Discrepancy marked as ignored
```

## Order Status Flow

```
┌─────────┐
│ Pending │
└────┬────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌──────────────┐   ┌──────────┐
│Payment       │   │Confirmed │
│Processing    │   └────┬─────┘
└──────┬───────┘        │
       │                │
       ▼                ▼
   ┌────────┐      ┌──────────┐
   │Confirmed│      │Preparing │
   └────────┘      └────┬─────┘
                        │
                        ▼
                   ┌──────────────┐
                   │Out for       │
                   │Delivery      │
                   └──────┬───────┘
                          │
                          ▼
                     ┌──────────┐
                     │Delivered │
                     └────┬─────┘
                          │
                          ▼
                     ┌──────────┐
                     │Returned  │
                     └──────────┘

Note: Orders can be canceled from Pending, Confirmed, or Preparing states
Note: Orders can fail from Payment Processing state
```

## Status-Based Actions Matrix

| Order Status | Available Actions |
|--------------|-------------------|
| Pending | View Details, Update Status, Cancel |
| Payment Processing | View Details, Update Status |
| Confirmed | View Details, Update Status, Assign Delivery, Cancel |
| Preparing | View Details, Update Status, Assign Delivery, Cancel |
| Out for Delivery | View Details, Update Status |
| Delivered | View Details, Process Return |
| Canceled | View Details |
| Returned | View Details |
| Failed | View Details |

## Color Coding

### Order Status Colors
- **Pending**: Warning (Orange)
- **Payment Processing**: Info (Blue)
- **Confirmed**: Primary (Blue)
- **Preparing**: Info (Blue)
- **Out for Delivery**: Secondary (Purple)
- **Delivered**: Success (Green)
- **Canceled**: Error (Red)
- **Returned**: Error (Red)
- **Failed**: Error (Red)

### Payment Status Colors
- **Pending**: Warning (Orange)
- **Completed**: Success (Green)
- **Failed**: Error (Red)
- **Refunded**: Info (Blue)

### Payment Discrepancy Colors
- **No Discrepancy (₹0)**: Success (Green)
- **Small Discrepancy (< ₹100)**: Warning (Orange)
- **Large Discrepancy (≥ ₹100)**: Error (Red)

## Data Flow

### Fetching Orders
```
User Action (page load, filter, sort, paginate)
    ↓
Dispatch fetchOrders action
    ↓
Redux Thunk calls orderService.getOrders()
    ↓
API call to backend: GET /api/v1/orders/admin/all
    ↓
Backend returns paginated order list
    ↓
Redux state updated with orders
    ↓
Component re-renders with new data
```

### Updating Order Status
```
User clicks "Update Status" and confirms
    ↓
Dispatch updateOrderStatus action
    ↓
Redux Thunk calls orderService.updateOrderStatus()
    ↓
API call to backend: PUT /api/v1/orders/:id/status
    ↓
Backend updates order and returns updated order
    ↓
Redux state updated with new order data
    ↓
Component re-renders with updated order
    ↓
[Backend] Notification sent to customer
```

### Assigning Delivery
```
User selects personnel and confirms
    ↓
Dispatch assignOrderToDelivery action
    ↓
Redux Thunk calls orderService.assignOrderToDelivery()
    ↓
API call to backend: POST /api/v1/delivery/assign
    ↓
Backend assigns delivery and updates order status
    ↓
Redux state updated with new order data
    ↓
Component re-renders with updated order
```

## Key Features Summary

### 1. Real-time Updates
- Order list refreshes after any action
- Selected order updates immediately
- Loading states prevent duplicate actions

### 2. Validation
- Only valid status transitions allowed
- Required fields enforced
- Business logic validation (e.g., can't assign delivered orders)

### 3. Error Handling
- API errors caught and displayed
- User-friendly error messages
- Retry capability

### 4. Performance
- Pagination reduces data load
- Efficient Redux state management
- Lazy loading of order details

### 5. User Experience
- Color-coded status indicators
- Context-aware action buttons
- Confirmation for destructive actions
- Loading indicators for async operations
- Empty states for no data

### 6. Accessibility
- Keyboard navigation support
- Screen reader friendly
- Clear labels and tooltips
- High contrast colors

## Integration Points

### Backend APIs Required
1. `GET /api/v1/orders/admin/all` - List orders with filters
2. `GET /api/v1/orders/:id` - Get order details
3. `PUT /api/v1/orders/:id/status` - Update order status
4. `POST /api/v1/delivery/assign` - Assign to delivery
5. `POST /api/v1/orders/:id/cancel` - Cancel order
6. `POST /api/v1/orders/:id/return` - Process return
7. `GET /api/v1/delivery/personnel` - Get available personnel
8. `GET /api/v1/orders/payment-discrepancies` - Get discrepancies
9. `PUT /api/v1/orders/payment-discrepancies/:id` - Resolve discrepancy

### State Management
- Redux store with orderSlice
- Async thunks for API calls
- Loading and error states
- Pagination and filter state

### Navigation
- Route: `/orders`
- Protected with authentication
- Accessible from sidebar menu

## Testing Scenarios

### Happy Path
1. ✅ View orders list
2. ✅ Apply filters and see filtered results
3. ✅ Sort orders by different columns
4. ✅ Navigate through pages
5. ✅ View order details
6. ✅ Update order status successfully
7. ✅ Assign order to delivery successfully
8. ✅ Cancel order successfully
9. ✅ Process return successfully
10. ✅ Resolve payment discrepancy successfully

### Error Scenarios
1. ✅ API returns error - display error message
2. ✅ Network timeout - show error and allow retry
3. ✅ Invalid status transition - prevent action
4. ✅ Missing required fields - show validation error
5. ✅ Concurrent updates - handle gracefully

### Edge Cases
1. ✅ Empty order list - show empty state
2. ✅ No available delivery personnel - show message
3. ✅ No payment discrepancies - show empty state
4. ✅ Large order list - pagination works correctly
5. ✅ Long customer names - text truncation works

## Performance Metrics

### Target Metrics
- Initial page load: < 2 seconds
- Filter application: < 1 second
- Order details load: < 1 second
- Status update: < 2 seconds
- Table pagination: < 500ms

### Optimization Techniques
- Pagination (20 items per page default)
- Redux memoization
- Lazy loading of dialogs
- Efficient re-rendering
- API response caching (where appropriate)

## Conclusion

The Order Management feature provides a comprehensive, user-friendly interface for managing orders throughout their lifecycle. The implementation follows React and Redux best practices, includes proper error handling, and provides a smooth user experience with loading states and real-time updates.
