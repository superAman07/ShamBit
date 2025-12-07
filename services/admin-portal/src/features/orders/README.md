# Order Management Feature

## Overview

The Order Management feature provides a comprehensive interface for administrators to manage customer orders throughout their entire lifecycle. This feature enables admins to view, filter, update order statuses, assign deliveries, process cancellations and returns, and review payment discrepancies.

## Features

### 1. Order List Page
- **Comprehensive Order Table**: Display all orders with key information including order number, customer details, status, payment info, total amount, order date, and delivery personnel
- **Advanced Filtering**: Filter orders by status, payment status, payment method, date range, order value range, and search by order number or customer name
- **Sorting**: Sort orders by order number, status, total amount, or creation date
- **Pagination**: Navigate through large order lists with configurable page sizes (10, 20, 50, 100)
- **Summary Cards**: Quick overview of total orders, pending orders, in-progress orders, and delivered orders
- **Status-based Actions**: Context-aware action buttons based on order status

### 2. Order Details Dialog
- **Complete Order Information**: View all order details including customer info, delivery address, payment details, order items, and timeline
- **Order Status Stepper**: Visual representation of order progress through the fulfillment workflow
- **Customer Information**: Name, mobile number, and email
- **Delivery Address**: Complete address with city, state, and pincode
- **Payment Information**: Payment method, status, payment ID, and promo code
- **Delivery Information**: Assigned delivery personnel details and estimated delivery time
- **Order Items Table**: Product details with images, unit prices, quantities, and totals
- **Order Summary**: Breakdown of subtotal, tax, delivery fee, discount, and total amount
- **Timeline**: Key timestamps including created, confirmed, delivered, or canceled dates

### 3. Order Status Management
- **Status Update Workflow**: Update order status with validation of allowed transitions
- **Status Transitions**:
  - Pending → Payment Processing, Confirmed, Canceled
  - Payment Processing → Confirmed, Failed
  - Confirmed → Preparing, Canceled
  - Preparing → Out for Delivery, Canceled
  - Out for Delivery → Delivered
  - Delivered → Returned
- **Status Notes**: Add optional notes when updating order status
- **Real-time Updates**: Order list and details update immediately after status changes

### 4. Delivery Assignment
- **Available Personnel List**: View all active and available delivery personnel
- **Personnel Details**: Name, mobile number, vehicle type, and vehicle number
- **Estimated Delivery Time**: Set expected delivery time when assigning orders
- **Automatic Status Update**: Order status automatically changes to "Out for Delivery" upon assignment
- **Assignment Validation**: Only confirmed or preparing orders can be assigned

### 5. Order Cancellation
- **Cancellation Workflow**: Cancel orders that are in confirmed or preparing status
- **Cancellation Reason**: Mandatory reason field for audit trail
- **Inventory Release**: Automatically releases reserved inventory back to available stock
- **Refund Processing**: Optional refund amount specification
- **Status Update**: Order status changes to "Canceled" with timestamp

### 6. Order Return Processing
- **Return Workflow**: Process returns for delivered orders
- **Return Reason**: Mandatory reason field for tracking return causes
- **Restock Option**: Choose whether to add returned items back to inventory
- **Refund Processing**: Optional refund amount specification
- **Status Update**: Order status changes to "Returned" with timestamp

### 7. Payment Discrepancy Review
- **Discrepancy List**: View all payment discrepancies detected by daily reconciliation
- **Discrepancy Details**: Order number, payment gateway ID, internal amount, gateway amount, and discrepancy amount
- **Status Filtering**: Filter by pending, resolved, ignored, or all discrepancies
- **Color-coded Alerts**: Visual indicators based on discrepancy severity
- **Resolution Actions**:
  - **Resolve**: Mark discrepancy as resolved with optional notes
  - **Ignore**: Mark discrepancy as ignored with optional notes
- **Audit Trail**: Track when discrepancies were detected, resolved, and by whom

## Components

### OrderListPage
Main page component that displays the order list with filters, summary cards, and action buttons.

**Key Features:**
- Order table with sorting and pagination
- Filter dialog integration
- Order details dialog integration
- Payment discrepancy dialog integration
- Summary statistics cards

### OrderDetailsDialog
Modal dialog that displays complete order information and provides action buttons for order management.

**Key Features:**
- Order status stepper visualization
- Customer and delivery information cards
- Order items table with product images
- Order summary with pricing breakdown
- Action forms for status update, delivery assignment, cancellation, and returns
- Context-aware action buttons based on order status

### OrderFiltersDialog
Modal dialog for applying advanced filters to the order list.

**Key Features:**
- Multi-select filters for status, payment status, and payment method
- Date range picker for order date filtering
- Order value range inputs
- Search field for order number or customer name
- Clear all filters option

### PaymentDiscrepancyDialog
Modal dialog for reviewing and resolving payment discrepancies.

**Key Features:**
- Discrepancy table with pagination
- Status filtering (pending, resolved, ignored, all)
- Color-coded discrepancy amounts
- Resolve and ignore actions with notes
- Integration with order details

## State Management

### Redux Slice: orderSlice
Manages all order-related state including:
- Order list with pagination
- Selected order details
- Available delivery personnel
- Payment discrepancies
- Loading states for all async operations
- Error states for all operations
- Filters and sorting preferences

### Actions
- `fetchOrders`: Fetch orders with filters, sorting, and pagination
- `fetchOrderById`: Fetch detailed information for a specific order
- `updateOrderStatus`: Update order status with optional notes
- `assignOrderToDelivery`: Assign order to delivery personnel
- `cancelOrder`: Cancel an order with reason
- `processOrderReturn`: Process order return with restock option
- `fetchAvailableDeliveryPersonnel`: Get list of available delivery personnel
- `fetchPaymentDiscrepancies`: Get payment discrepancies with filtering
- `resolvePaymentDiscrepancy`: Resolve or ignore a payment discrepancy
- `setFilters`: Update filter criteria
- `setSorting`: Update sorting preferences
- `setPage`: Change current page
- `setPageSize`: Change page size
- `clearSelectedOrder`: Clear selected order from state
- `clearErrors`: Clear all error messages

## API Integration

### Order Service
Service layer that handles all API calls related to orders.

**Endpoints:**
- `GET /api/v1/orders/admin/all` - Get orders with filters and pagination
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id/status` - Update order status
- `POST /api/v1/delivery/assign` - Assign order to delivery personnel
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/return` - Process order return
- `GET /api/v1/delivery/personnel` - Get available delivery personnel
- `GET /api/v1/orders/payment-discrepancies` - Get payment discrepancies
- `PUT /api/v1/orders/payment-discrepancies/:id` - Resolve payment discrepancy
- `GET /api/v1/orders/admin/statistics` - Get order statistics

## Usage

### Viewing Orders
1. Navigate to the Orders page from the sidebar
2. View the order list with summary statistics
3. Use sorting by clicking on column headers
4. Use pagination controls to navigate through pages

### Filtering Orders
1. Click the "Filters" button in the header
2. Select desired filter criteria (status, payment, dates, value range)
3. Click "Apply Filters" to update the order list
4. Click "Clear Filters" to reset all filters

### Viewing Order Details
1. Click the "View" icon (eye) in the Actions column
2. Review all order information in the dialog
3. Use the status stepper to see order progress
4. Close the dialog when done

### Updating Order Status
1. Open the order details dialog
2. Click "Update Status" button
3. Select the new status from available transitions
4. Add optional notes
5. Click "Update Status" to confirm

### Assigning Delivery
1. Open the order details dialog for a confirmed or preparing order
2. Click "Assign Delivery" button
3. Select delivery personnel from the dropdown
4. Optionally set estimated delivery time
5. Click "Assign" to confirm

### Canceling Orders
1. Open the order details dialog for a confirmed or preparing order
2. Click "Cancel Order" button
3. Enter cancellation reason (required)
4. Click "Confirm Cancellation"

### Processing Returns
1. Open the order details dialog for a delivered order
2. Click "Process Return" button
3. Enter return reason (required)
4. Choose whether to restock items
5. Click "Process Return" to confirm

### Reviewing Payment Discrepancies
1. Click "Payment Discrepancies" button in the header
2. View the list of discrepancies
3. Filter by status (pending, resolved, ignored)
4. Click "Resolve" or "Ignore" for pending discrepancies
5. Add optional notes
6. Confirm the action

## Requirements Mapping

This feature implements the following requirements from the SRS:

### FR-8.1: Order Management and Fulfillment
- ✅ Display all orders with filters for status, date range, and order value
- ✅ Display new orders in real-time on the dashboard
- ✅ Allow admin to update order status to Preparing, Out for Delivery, or Delivered
- ✅ Notify customer through the Customer App within 30 seconds when order status is updated
- ✅ Display order details including customer information, items, payment status, and delivery address

### FR-8.2: Failed or Returned Deliveries
- ✅ Allow admin to update order status to "Canceled" or "Returned"
- ✅ Provide option to restock items when order is marked as "Returned"
- ✅ Add quantities back to inventory when admin chooses to restock returned items

### FR-4.4: Payment Discrepancies
- ✅ Run daily reconciliation job to compare transaction logs with Payment Gateway records
- ✅ Identify and flag orders that were paid for but not created in the system
- ✅ Display flagged payment discrepancies for manual review in Admin Portal

## Technical Details

### TypeScript Types
All order-related types are defined in `src/types/order.ts`:
- `Order`: Complete order information
- `OrderStatus`: Order status enum
- `PaymentStatus`: Payment status enum
- `PaymentMethod`: Payment method enum
- `OrderItem`: Individual order item
- `Customer`: Customer information
- `DeliveryPersonnel`: Delivery personnel information
- `OrderFilters`: Filter criteria
- `PaymentDiscrepancy`: Payment discrepancy information
- `OrderStatusUpdate`: Status update payload
- `OrderAssignment`: Delivery assignment payload
- `OrderCancellation`: Cancellation payload
- `OrderReturn`: Return processing payload

### Error Handling
- All API errors are caught and displayed to the user
- Loading states prevent duplicate submissions
- Form validation ensures required fields are filled
- Optimistic UI updates with rollback on error

### Performance Optimizations
- Pagination reduces data transfer and rendering time
- Redux state management prevents unnecessary re-renders
- Lazy loading of order details on demand
- Efficient filtering and sorting on the backend

## Future Enhancements

1. **Bulk Actions**: Select multiple orders for bulk status updates
2. **Export Functionality**: Export filtered order list to CSV/Excel
3. **Advanced Search**: Full-text search across all order fields
4. **Order Notes**: Add internal notes to orders for team communication
5. **Delivery Tracking**: Real-time map view of delivery personnel location
6. **Automated Assignment**: AI-based delivery personnel assignment
7. **Order Templates**: Save common order configurations
8. **Refund Management**: Integrated refund processing workflow
9. **Customer Communication**: Send custom messages to customers
10. **Order Analytics**: Detailed analytics and insights on order patterns