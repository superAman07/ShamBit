# Order Processing System - Phase 3: API Routes Complete

## ✅ Phase 3A Completed - API Routes Implementation

### New API Endpoints Added (14 endpoints)

#### Hold Management (2 endpoints)
1. ✅ `PUT /api/v1/orders/admin/:id/hold` - Put order on hold
2. ✅ `PUT /api/v1/orders/admin/:id/release-hold` - Release order from hold

#### Delivery Management (5 endpoints)
3. ✅ `PUT /api/v1/orders/admin/:id/ready-for-pickup` - Mark order ready for pickup
4. ✅ `POST /api/v1/orders/admin/:id/delivery-attempt` - Record failed delivery
5. ✅ `PUT /api/v1/orders/admin/:id/retry-delivery` - Reschedule delivery
6. ✅ `PUT /api/v1/orders/admin/:id/delivery-instructions` - Update delivery notes
7. ✅ `POST /api/v1/orders/:id/return-request` - Customer requests return

#### Return Management (4 endpoints)
8. ✅ `PUT /api/v1/orders/admin/:id/return/approve` - Approve return request
9. ✅ `PUT /api/v1/orders/admin/:id/return/reject` - Reject return request
10. ✅ `PUT /api/v1/orders/admin/:id/return/schedule-pickup` - Schedule return pickup
11. ✅ `PUT /api/v1/orders/admin/:id/return/complete` - Complete return process

#### Refund Management (2 endpoints)
12. ✅ `POST /api/v1/orders/admin/:id/refund/initiate` - Initiate refund
13. ✅ `PUT /api/v1/orders/admin/:id/refund/complete` - Complete refund

#### Customer Communication (1 endpoint)
14. ✅ `POST /api/v1/orders/admin/:id/contact-customer` - Log customer contact

### Validation Schemas Added

All endpoints include comprehensive Zod validation:

```typescript
// Hold Management
putOnHoldSchema: {
  reason: string (1-500 chars, required)
  notes: string (max 1000 chars, optional)
}

// Delivery Attempt
recordDeliveryAttemptSchema: {
  reason: string (1-500 chars, required)
  notes: string (max 1000 chars, optional)
  rescheduleTime: datetime (optional)
}

// Retry Delivery
retryDeliverySchema: {
  newDeliveryTime: datetime (optional)
  deliveryPersonnelId: UUID (optional)
  notes: string (max 1000 chars, optional)
}

// Return Request
requestReturnSchema: {
  reason: string (1-1000 chars, required)
}

// Approve Return
approveReturnSchema: {
  notes: string (max 1000 chars, optional)
  restockItems: boolean (default: true)
}

// Reject Return
rejectReturnSchema: {
  reason: string (1-500 chars, required)
}

// Schedule Pickup
scheduleReturnPickupSchema: {
  pickupTime: datetime (required)
  notes: string (max 1000 chars, optional)
}

// Complete Return
completeReturnSchema: {
  restockItems: boolean (default: true)
  notes: string (max 1000 chars, optional)
}

// Initiate Refund
initiateRefundSchema: {
  amount: number (positive, optional)
  reason: string (max 500 chars, optional)
}

// Complete Refund
completeRefundSchema: {
  refundReference: string (1-255 chars, required)
  notes: string (max 1000 chars, optional)
}

// Contact Customer
contactCustomerSchema: {
  method: enum ['phone', 'sms', 'whatsapp', 'email']
  message: string (1-1000 chars, required)
  responseReceived: boolean (optional)
  followUpRequired: boolean (optional)
}

// Update Delivery Instructions
updateDeliveryInstructionsSchema: {
  instructions: string (1-500 chars, required)
}
```

### Error Handling

All endpoints include comprehensive error handling:
- ✅ Zod validation errors (400)
- ✅ AppError handling with proper status codes
- ✅ Generic error fallback (500)
- ✅ Detailed error messages with codes

### Example API Calls

#### 1. Put Order on Hold
```bash
curl -X PUT http://localhost:3000/api/v1/orders/admin/{orderId}/hold \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Payment verification needed",
    "notes": "Waiting for bank confirmation"
  }'
```

#### 2. Record Delivery Attempt
```bash
curl -X POST http://localhost:3000/api/v1/orders/admin/{orderId}/delivery-attempt \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer not home",
    "notes": "Called customer, will retry tomorrow at 10 AM"
  }'
```

#### 3. Approve Return
```bash
curl -X PUT http://localhost:3000/api/v1/orders/admin/{orderId}/return/approve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Approved - product damaged",
    "restockItems": true
  }'
```

#### 4. Initiate Refund
```bash
curl -X POST http://localhost:3000/api/v1/orders/admin/{orderId}/refund/initiate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "reason": "Product return"
  }'
```

#### 5. Customer Request Return
```bash
curl -X POST http://localhost:3000/api/v1/orders/{orderId}/return-request \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Product arrived damaged"
  }'
```

### API Response Format

All endpoints follow consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional, for validation errors
  }
}
```

### Authentication & Authorization

- ✅ All admin endpoints require `authenticate` + `requireAdmin` middleware
- ✅ Customer endpoints (return request) require `authenticate` only
- ✅ Admin email automatically extracted from JWT/database
- ✅ All actions logged with admin details

### Testing the API

You can test all endpoints using:

1. **Postman/Insomnia** - Import the API collection
2. **curl** - Use the examples above
3. **Admin Portal** - Once UI is implemented

---

## 🚧 Phase 3B: Admin Portal UI (Next Steps)

### Components to Create

#### 1. Order Action Buttons Component
```typescript
// OrderActionButtons.tsx
interface Props {
  order: OrderDetails;
  onAction: (action: string) => void;
}

// Renders status-specific buttons
// Example: When status is 'preparing'
<Button onClick={() => onAction('markReady')}>
  Mark Ready for Pickup
</Button>
<Button onClick={() => onAction('putOnHold')}>
  Put on Hold
</Button>
```

#### 2. Delivery Attempt Dialog
```typescript
// DeliveryAttemptDialog.tsx
interface Props {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Fields:
// - Reason (dropdown: Customer not home, Wrong address, Phone unreachable, etc.)
// - Notes (textarea)
// - Reschedule time (datetime picker)
// - Contact customer button
```

#### 3. Return Management Dialog
```typescript
// ReturnManagementDialog.tsx
interface Props {
  open: boolean;
  order: OrderDetails;
  onClose: () => void;
  onSuccess: () => void;
}

// Tabs:
// - Review (show return reason, approve/reject)
// - Schedule Pickup (date/time picker)
// - Complete (restock checkbox, notes)
```

#### 4. Hold Order Dialog
```typescript
// HoldOrderDialog.tsx
interface Props {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Fields:
// - Reason (dropdown: Payment verification, Stock issue, Customer request, Quality check)
// - Notes (textarea)
// - Expected resolution date (date picker)
```

#### 5. Customer Contact Dialog
```typescript
// CustomerContactDialog.tsx
interface Props {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Fields:
// - Method (radio: Phone, SMS, WhatsApp, Email)
// - Message (textarea)
// - Response received (checkbox)
// - Follow-up required (checkbox)
```

#### 6. Refund Management Dialog
```typescript
// RefundManagementDialog.tsx
interface Props {
  open: boolean;
  order: OrderDetails;
  onClose: () => void;
  onSuccess: () => void;
}

// Fields:
// - Refund amount (number input, default to order total)
// - Refund reference (text input, for complete refund)
// - Notes (textarea)
```

### Update OrderDetailsDialog

Add status-specific action sections:

```typescript
// In OrderDetailsDialog.tsx

const renderActions = () => {
  switch (order.status) {
    case 'confirmed':
      return (
        <>
          <Button onClick={handleStartPreparing}>Start Preparing</Button>
          <Button onClick={handlePutOnHold}>Put on Hold</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'on_hold':
      return (
        <>
          <Button onClick={handleReleaseHold}>Release Hold & Continue</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'preparing':
      return (
        <>
          <Button onClick={handleMarkReady}>Mark Ready for Pickup</Button>
          <Button onClick={handlePutOnHold}>Put on Hold</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'ready_for_pickup':
      return (
        <>
          <Button onClick={handleAssignDelivery}>Assign Delivery Personnel</Button>
          <Button onClick={handlePutOnHold}>Put on Hold</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'out_for_delivery':
      return (
        <>
          <Button onClick={handleMarkDelivered}>Mark as Delivered</Button>
          <Button onClick={handleRecordAttempt}>Record Delivery Attempt</Button>
          <Button onClick={handleContactCustomer}>Contact Customer</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'delivery_attempted':
      return (
        <>
          <Button onClick={handleRetryDelivery}>Retry Delivery</Button>
          <Button onClick={handleContactCustomer}>Contact Customer</Button>
          <Button onClick={handleCancel}>Cancel Order</Button>
        </>
      );
    
    case 'return_requested':
      return (
        <>
          <Button onClick={handleApproveReturn}>Approve Return</Button>
          <Button onClick={handleRejectReturn}>Reject Return</Button>
        </>
      );
    
    case 'return_approved':
      return (
        <>
          <Button onClick={handleSchedulePickup}>Schedule Pickup</Button>
        </>
      );
    
    case 'returned':
      return (
        <>
          <Button onClick={handleInitiateRefund}>Initiate Refund</Button>
        </>
      );
    
    case 'refund_pending':
      return (
        <>
          <Button onClick={handleCompleteRefund}>Mark Refund Complete</Button>
        </>
      );
    
    default:
      return null;
  }
};
```

### Service Methods to Add (Admin Portal)

```typescript
// services/admin-portal/src/services/orderService.ts

// Hold Management
async putOnHold(orderId: string, data: PutOnHoldRequest): Promise<void>
async releaseHold(orderId: string): Promise<void>

// Delivery Management
async markReadyForPickup(orderId: string): Promise<void>
async recordDeliveryAttempt(orderId: string, data: RecordDeliveryAttemptRequest): Promise<void>
async retryDelivery(orderId: string, data: RetryDeliveryRequest): Promise<void>
async updateDeliveryInstructions(orderId: string, instructions: string): Promise<void>

// Return Management
async approveReturn(orderId: string, data: ApproveReturnRequest): Promise<void>
async rejectReturn(orderId: string, reason: string): Promise<void>
async scheduleReturnPickup(orderId: string, data: ScheduleReturnPickupRequest): Promise<void>
async completeReturn(orderId: string, data: CompleteReturnRequest): Promise<void>

// Refund Management
async initiateRefund(orderId: string, data: InitiateRefundRequest): Promise<void>
async completeRefund(orderId: string, data: CompleteRefundRequest): Promise<void>

// Customer Communication
async contactCustomer(orderId: string, data: ContactCustomerRequest): Promise<void>
```

### Status Display Updates

Add new status colors and labels:

```typescript
// utils/orderStatus.ts

export const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'gray', icon: 'clock' },
  payment_processing: { label: 'Processing Payment', color: 'blue', icon: 'credit-card' },
  payment_failed: { label: 'Payment Failed', color: 'red', icon: 'x-circle' },
  confirmed: { label: 'Confirmed', color: 'green', icon: 'check-circle' },
  on_hold: { label: 'On Hold', color: 'orange', icon: 'pause-circle' },
  preparing: { label: 'Preparing', color: 'blue', icon: 'package' },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'purple', icon: 'box' },
  out_for_delivery: { label: 'Out for Delivery', color: 'blue', icon: 'truck' },
  delivery_attempted: { label: 'Delivery Attempted', color: 'yellow', icon: 'alert-circle' },
  delivered: { label: 'Delivered', color: 'green', icon: 'check-circle' },
  return_requested: { label: 'Return Requested', color: 'orange', icon: 'rotate-ccw' },
  return_approved: { label: 'Return Approved', color: 'blue', icon: 'check' },
  return_rejected: { label: 'Return Rejected', color: 'red', icon: 'x' },
  return_pickup_scheduled: { label: 'Pickup Scheduled', color: 'purple', icon: 'calendar' },
  return_in_transit: { label: 'Return in Transit', color: 'blue', icon: 'truck' },
  returned: { label: 'Returned', color: 'gray', icon: 'rotate-ccw' },
  refund_pending: { label: 'Refund Pending', color: 'yellow', icon: 'dollar-sign' },
  refunded: { label: 'Refunded', color: 'green', icon: 'check-circle' },
  canceled: { label: 'Canceled', color: 'red', icon: 'x-circle' },
  failed: { label: 'Failed', color: 'red', icon: 'alert-triangle' },
};
```

---

## 📊 API Endpoints Summary

### Total Endpoints: 14 new + existing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/admin/:id/hold` | Admin | Put order on hold |
| PUT | `/admin/:id/release-hold` | Admin | Release hold |
| PUT | `/admin/:id/ready-for-pickup` | Admin | Mark ready |
| POST | `/admin/:id/delivery-attempt` | Admin | Record attempt |
| PUT | `/admin/:id/retry-delivery` | Admin | Retry delivery |
| PUT | `/admin/:id/delivery-instructions` | Admin | Update instructions |
| POST | `/:id/return-request` | Customer | Request return |
| PUT | `/admin/:id/return/approve` | Admin | Approve return |
| PUT | `/admin/:id/return/reject` | Admin | Reject return |
| PUT | `/admin/:id/return/schedule-pickup` | Admin | Schedule pickup |
| PUT | `/admin/:id/return/complete` | Admin | Complete return |
| POST | `/admin/:id/refund/initiate` | Admin | Initiate refund |
| PUT | `/admin/:id/refund/complete` | Admin | Complete refund |
| POST | `/admin/:id/contact-customer` | Admin | Log contact |

---

## ✅ Phase 3A Achievements

### Technical
- ✅ 14 new API endpoints implemented
- ✅ 12 validation schemas added
- ✅ Comprehensive error handling
- ✅ Consistent response format
- ✅ Full authentication/authorization
- ✅ No TypeScript errors
- ✅ API server running successfully

### Operational
- ✅ Complete hold management workflow
- ✅ Enhanced delivery tracking
- ✅ Full return management workflow
- ✅ Refund tracking and completion
- ✅ Customer communication logging
- ✅ Delivery instructions management

### Quality
- ✅ Input validation on all endpoints
- ✅ Proper error messages
- ✅ Audit trail maintained
- ✅ Transaction safety
- ✅ Consistent API design

---

## 🎯 Next Steps

1. **Create UI Components** (6 dialogs)
2. **Update OrderDetailsDialog** with action buttons
3. **Add service methods** to admin portal
4. **Update status display** with new statuses
5. **Test end-to-end** workflows
6. **Create user documentation**

---

**Phase 3A Completion Date:** December 7, 2025  
**Status:** ✅ API Routes Complete  
**Next:** Phase 3B - Admin Portal UI Implementation  
**API Server:** Running on port 3000 with all endpoints active
