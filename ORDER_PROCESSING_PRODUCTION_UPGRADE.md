# Order Processing System - Production Upgrade Plan

## Executive Summary
Comprehensive upgrade of the order processing system to production-ready standards with enhanced status management, better operational controls, and professional workflows.

## Current State Analysis

### Existing Order Statuses
- `pending` - Order created, awaiting payment
- `payment_processing` - Payment gateway processing
- `confirmed` - Payment successful, order confirmed
- `preparing` - Order being prepared
- `out_for_delivery` - Assigned to delivery personnel
- `delivered` - Successfully delivered
- `canceled` - Order canceled
- `returned` - Order returned after delivery
- `failed` - Payment failed

### Gaps Identified
1. **No intermediate states** between preparing and delivery
2. **No failed delivery handling** (customer not home, wrong address)
3. **No return workflow** (request → approval → pickup → refund)
4. **No hold/pause mechanism** for operational issues
5. **Limited refund tracking** (pending vs completed)
6. **No partial delivery support** for split orders

---

## Production-Ready Status System

### New Order Statuses

#### Core Flow Statuses
1. **`pending`** - Order created, awaiting payment
2. **`payment_processing`** - Payment gateway processing
3. **`payment_failed`** - Payment failed (can retry)
4. **`confirmed`** - Payment successful, order confirmed
5. **`on_hold`** - Temporarily paused (payment verification, stock issues, customer request)
6. **`preparing`** - Order being prepared/packed
7. **`ready_for_pickup`** - Packed and ready for delivery personnel
8. **`out_for_delivery`** - Assigned to delivery personnel, in transit
9. **`delivery_attempted`** - Delivery failed (customer unavailable, address issue)
10. **`delivered`** - Successfully delivered
11. **`canceled`** - Order canceled before delivery
12. **`failed`** - Order failed (cannot be fulfilled)

#### Return & Refund Statuses
13. **`return_requested`** - Customer requested return
14. **`return_approved`** - Admin approved return
15. **`return_rejected`** - Admin rejected return
16. **`return_pickup_scheduled`** - Pickup scheduled
17. **`return_in_transit`** - Return being picked up
18. **`returned`** - Return completed, items received
19. **`refund_pending`** - Refund initiated, processing
20. **`refunded`** - Refund completed

#### Partial Delivery (Future Enhancement)
21. **`partially_delivered`** - Some items delivered, some pending

---

## Enhanced Payment Status

### Current
- `pending`
- `completed`
- `failed`
- `refunded`

### New
- `pending` - Awaiting payment
- `processing` - Payment gateway processing
- `completed` - Payment successful
- `failed` - Payment failed
- `refund_initiated` - Refund requested
- `refund_processing` - Refund in progress
- `refund_completed` - Refund successful
- `refund_failed` - Refund failed (needs manual intervention)
- `partially_refunded` - Partial refund completed

---

## Status Transition Rules

### Valid Transitions Matrix

```
FROM                    → TO (Valid Next States)
─────────────────────────────────────────────────────────────
pending                 → payment_processing, canceled
payment_processing      → confirmed, payment_failed, failed
payment_failed          → payment_processing (retry), canceled
confirmed               → preparing, on_hold, canceled
on_hold                 → preparing, canceled
preparing               → ready_for_pickup, on_hold, canceled
ready_for_pickup        → out_for_delivery, on_hold, canceled
out_for_delivery        → delivered, delivery_attempted, canceled
delivery_attempted      → out_for_delivery (retry), canceled, failed
delivered               → return_requested
return_requested        → return_approved, return_rejected
return_approved         → return_pickup_scheduled
return_pickup_scheduled → return_in_transit
return_in_transit       → returned
returned                → refund_pending
refund_pending          → refunded
canceled                → (terminal state)
failed                  → (terminal state)
refunded                → (terminal state)
```

---

## New Database Schema Changes

### 1. Add New Columns to `orders` Table
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS on_hold_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempted_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempt_count INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_failure_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_approved_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES product_offers(id);
```

### 2. Enhanced Order History Action Types
```typescript
type OrderHistoryActionType =
  | 'order_created'
  | 'status_change'
  | 'payment_status_change'
  | 'delivery_assignment'
  | 'delivery_attempt'
  | 'on_hold'
  | 'hold_released'
  | 'cancellation'
  | 'return_request'
  | 'return_approval'
  | 'return_rejection'
  | 'return_pickup'
  | 'return_complete'
  | 'refund_initiated'
  | 'refund_completed'
  | 'note'
  | 'customer_contact'
  | 'item_substitution';
```

---

## New Service Methods

### Order Status Management
1. **`putOnHold(orderId, reason, adminId)`** - Pause order processing
2. **`releaseHold(orderId, adminId)`** - Resume order processing
3. **`markReadyForPickup(orderId, adminId)`** - Mark as ready for delivery
4. **`recordDeliveryAttempt(orderId, reason, adminId)`** - Log failed delivery
5. **`retryDelivery(orderId, newDeliveryTime, adminId)`** - Reschedule delivery

### Return Management
6. **`requestReturn(orderId, reason, userId)`** - Customer initiates return
7. **`approveReturn(orderId, adminId, notes)`** - Admin approves return
8. **`rejectReturn(orderId, adminId, reason)`** - Admin rejects return
9. **`scheduleReturnPickup(orderId, pickupTime, adminId)`** - Schedule pickup
10. **`completeReturn(orderId, adminId, restockItems)`** - Process returned items

### Refund Management
11. **`initiateRefund(orderId, amount, adminId)`** - Start refund process
12. **`completeRefund(orderId, refundReference, adminId)`** - Mark refund complete
13. **`handleRefundFailure(orderId, reason, adminId)`** - Handle refund issues

### Customer Communication
14. **`contactCustomer(orderId, method, message, adminId)`** - Log customer contact
15. **`updateDeliveryInstructions(orderId, instructions, adminId)`** - Update delivery notes

---

## Admin Portal Enhancements

### Order Details Dialog - New Actions

#### Status-Based Actions
**When `confirmed`:**
- ✅ Start Preparing
- ✅ Put on Hold
- ✅ Cancel Order

**When `on_hold`:**
- ✅ Release Hold & Continue
- ✅ Cancel Order
- 📝 Add Hold Reason/Notes

**When `preparing`:**
- ✅ Mark Ready for Pickup
- ✅ Put on Hold
- ✅ Cancel Order

**When `ready_for_pickup`:**
- ✅ Assign Delivery Personnel
- ✅ Put on Hold
- ✅ Cancel Order

**When `out_for_delivery`:**
- ✅ Mark as Delivered
- ✅ Record Delivery Attempt (Failed)
- 📞 Contact Customer
- ✅ Cancel Order

**When `delivery_attempted`:**
- ✅ Retry Delivery (Reschedule)
- ✅ Cancel Order
- 📞 Contact Customer
- 📝 Update Delivery Instructions

**When `delivered`:**
- ✅ Process Return (if requested)
- 📝 Add Notes

**When `return_requested`:**
- ✅ Approve Return
- ❌ Reject Return
- 📝 Add Notes

**When `return_approved`:**
- ✅ Schedule Pickup
- 📝 Add Notes

**When `returned`:**
- ✅ Initiate Refund
- 📝 Add Notes

**When `refund_pending`:**
- ✅ Mark Refund Complete
- ❌ Report Refund Failure
- 📝 Add Notes

### New UI Components

#### 1. Delivery Attempt Dialog
- Reason dropdown (Customer not home, Wrong address, Phone unreachable, etc.)
- Notes field
- Reschedule date/time picker
- Contact customer button

#### 2. Return Management Dialog
- Return reason (view only for customer request)
- Admin notes field
- Approve/Reject buttons
- Restock items checkbox
- Refund amount calculator

#### 3. Hold Order Dialog
- Hold reason dropdown (Payment verification, Stock issue, Customer request, Quality check)
- Notes field
- Expected resolution date

#### 4. Customer Contact Log
- Contact method (Phone, SMS, WhatsApp, Email)
- Message/Notes
- Response received checkbox
- Follow-up required checkbox

---

## Operational Workflows

### Workflow 1: Normal Order Flow
```
1. Customer places order → `pending`
2. Payment successful → `confirmed`
3. Admin starts preparing → `preparing`
4. Order packed → `ready_for_pickup`
5. Assign delivery person → `out_for_delivery`
6. Delivered → `delivered`
```

### Workflow 2: Failed Delivery
```
1. Out for delivery → `out_for_delivery`
2. Customer not home → `delivery_attempted`
3. Contact customer, reschedule
4. Retry delivery → `out_for_delivery`
5. Delivered → `delivered`
```

### Workflow 3: Return Process
```
1. Customer requests return → `return_requested`
2. Admin reviews → `return_approved`
3. Schedule pickup → `return_pickup_scheduled`
4. Pickup in progress → `return_in_transit`
5. Items received → `returned`
6. Initiate refund → `refund_pending`
7. Refund processed → `refunded`
```

### Workflow 4: Order on Hold
```
1. Order confirmed → `confirmed`
2. Payment verification needed → `on_hold`
3. Verification complete → `preparing`
4. Continue normal flow...
```

---

## Implementation Priority

### Phase 1: Critical (Immediate)
1. ✅ Add `ready_for_pickup` status
2. ✅ Add `delivery_attempted` status
3. ✅ Add `on_hold` status
4. ✅ Implement delivery attempt tracking
5. ✅ Update status transition validation

### Phase 2: Important (Week 1)
6. ✅ Add return workflow statuses
7. ✅ Implement return management methods
8. ✅ Add refund tracking fields
9. ✅ Update admin portal UI for new statuses
10. ✅ Add delivery attempt dialog

### Phase 3: Enhanced (Week 2)
11. ✅ Customer contact logging
12. ✅ Hold management UI
13. ✅ Return management UI
14. ✅ Enhanced timeline view
15. ✅ Notification templates for new statuses

---

## Testing Checklist

### Status Transitions
- [ ] Test all valid transitions
- [ ] Test invalid transitions (should fail)
- [ ] Test terminal states (cannot transition)

### Delivery Scenarios
- [ ] Normal delivery flow
- [ ] Failed delivery → retry → success
- [ ] Multiple failed attempts → cancel
- [ ] Customer contact during delivery

### Return Scenarios
- [ ] Customer return request
- [ ] Admin approval → pickup → refund
- [ ] Admin rejection
- [ ] Partial returns (future)

### Edge Cases
- [ ] Order on hold → cancel
- [ ] Payment failure → retry → success
- [ ] Refund failure → manual intervention
- [ ] Concurrent status updates

---

## Monitoring & Analytics

### Key Metrics to Track
1. **Delivery Success Rate** - % of first-attempt deliveries
2. **Average Delivery Attempts** - Before successful delivery
3. **Return Rate** - % of delivered orders returned
4. **Refund Processing Time** - Time from return to refund
5. **Orders on Hold** - Current count and average duration
6. **Cancellation Rate by Status** - Where orders are canceled most

### Alerts to Configure
- Orders stuck in `preparing` > 2 hours
- Orders stuck in `ready_for_pickup` > 1 hour
- Delivery attempts > 3 times
- Refunds pending > 7 days
- Orders on hold > 24 hours

---

## Next Steps

1. **Review & Approve** this plan
2. **Create database migration** for new columns
3. **Update TypeScript types** for new statuses
4. **Implement service methods** for new workflows
5. **Update admin portal UI** with new actions
6. **Add notification templates** for new statuses
7. **Update mobile app** to show new statuses
8. **Test thoroughly** with all scenarios
9. **Deploy to staging** for UAT
10. **Train operations team** on new workflows

---

## Estimated Timeline
- **Phase 1 (Critical)**: 2-3 days
- **Phase 2 (Important)**: 4-5 days
- **Phase 3 (Enhanced)**: 3-4 days
- **Testing & QA**: 3-4 days
- **Total**: ~2 weeks for complete implementation

---

## Success Criteria
✅ All new statuses implemented and working
✅ Status transitions validated and enforced
✅ Admin portal supports all new workflows
✅ Delivery attempt tracking functional
✅ Return management complete
✅ Refund tracking accurate
✅ All tests passing
✅ Operations team trained
✅ Documentation complete
