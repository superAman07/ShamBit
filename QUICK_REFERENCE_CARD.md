# Order Processing - Quick Reference Card

## 🚀 Quick Actions by Status

### CONFIRMED → Start Processing
```
Actions: [Start Preparing] [Put on Hold] [Cancel Order]
```
- **Start Preparing** - Begin order preparation
- **Put on Hold** - Need verification? Click here
- **Cancel Order** - Customer cancelled? Click here

### ON_HOLD → Resume Processing
```
Actions: [Release Hold & Continue] [Cancel Order]
```
- **Release Hold** - Issue resolved? Resume order
- **Cancel Order** - Can't resolve? Cancel order

### PREPARING → Mark Ready
```
Actions: [Mark Ready for Pickup] [Put on Hold] [Cancel Order]
```
- **Mark Ready** - Order packed? Click here
- **Put on Hold** - Need to pause? Click here
- **Cancel Order** - Issue found? Cancel order

### OUT_FOR_DELIVERY → Track Delivery
```
Actions: [Record Delivery Attempt] [Contact Customer] [Cancel Order]
```
- **Record Attempt** - Delivery failed? Log it here
- **Contact Customer** - Need to call? Log it here
- **Cancel Order** - Major issue? Cancel order

### DELIVERY_ATTEMPTED → Retry
```
Actions: [Retry Delivery] [Contact Customer] [Cancel Order]
```
- **Retry Delivery** - Reschedule delivery
- **Contact Customer** - Call customer first
- **Cancel Order** - Can't deliver? Cancel

### RETURN_REQUESTED → Approve/Reject
```
Actions: [Approve Return] [Reject Return]
```
- **Approve Return** - Valid return? Approve it
- **Reject Return** - Invalid return? Reject it

### RETURNED → Process Refund
```
Actions: [Initiate Refund]
```
- **Initiate Refund** - Start refund process

### REFUND_PENDING → Complete Refund
```
Actions: [Mark Refund Complete]
```
- **Complete Refund** - Refund processed? Mark complete

---

## 📋 Common Scenarios

### Scenario 1: Customer Not Home
1. Click **"Record Delivery Attempt"**
2. Select **"Customer Not Available"**
3. Add notes: "Called, no answer"
4. Click **"Contact Customer"**
5. Select **"Phone"**
6. Add notes: "Left voicemail"
7. Click **"Retry Delivery"**
8. Set new time
9. Done!

### Scenario 2: Payment Verification
1. Click **"Put on Hold"**
2. Select **"Payment Verification Required"**
3. Add notes: "Checking with gateway"
4. Verify payment
5. Click **"Release Hold & Continue"**
6. Done!

### Scenario 3: Customer Return
1. Review return request
2. Click **"Approve Return"**
3. Check **"Restock items"**
4. Add notes if needed
5. After return received:
6. Click **"Initiate Refund"**
7. Choose full/partial
8. Process in payment gateway
9. Click **"Mark Refund Complete"**
10. Enter transaction ID
11. Done!

### Scenario 4: Wrong Address
1. Click **"Record Delivery Attempt"**
2. Select **"Address Not Found"**
3. Add notes: "Building number wrong"
4. Click **"Contact Customer"**
5. Select **"Phone"**
6. Add notes: "Got correct address"
7. Click **"Retry Delivery"**
8. Done!

---

## 🎨 Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| PENDING | Gray | Just created |
| CONFIRMED | Green | Payment done |
| ON_HOLD | Orange | Paused |
| PREPARING | Blue | Being packed |
| READY_FOR_PICKUP | Purple | Ready to go |
| OUT_FOR_DELIVERY | Blue | On the way |
| DELIVERY_ATTEMPTED | Orange | Failed delivery |
| DELIVERED | Green | Success! |
| RETURN_REQUESTED | Orange | Customer wants return |
| RETURNED | Gray | Return received |
| REFUND_PENDING | Orange | Processing refund |
| REFUNDED | Green | Refund complete |
| CANCELED | Red | Cancelled |

---

## 📞 Contact Methods

When clicking **"Contact Customer"**:
- **PHONE** - Called customer
- **SMS** - Sent text message
- **WHATSAPP** - Sent WhatsApp message
- **EMAIL** - Sent email

Always add notes about what was discussed!

---

## ⏸️ Hold Reasons

When clicking **"Put on Hold"**:
- **Payment Verification Required** - Check payment
- **Address Verification Required** - Confirm address
- **Inventory Check** - Check stock
- **Customer Request** - Customer asked
- **Quality Check** - Check quality
- **Other** - Other reason

---

## 🚚 Delivery Failure Reasons

When clicking **"Record Delivery Attempt"**:
- **Customer Not Available** - No one home
- **Wrong Address** - Address incorrect
- **Customer Refused** - Customer rejected
- **Address Not Found** - Can't find location
- **Customer Requested Reschedule** - Customer wants later
- **Other** - Other reason

---

## 💡 Tips

### DO:
✅ Always add notes when taking actions
✅ Contact customer before cancelling
✅ Use hold instead of cancel when possible
✅ Log all customer communications
✅ Check timeline before taking action

### DON'T:
❌ Cancel without trying to resolve
❌ Skip recording delivery attempts
❌ Forget to add notes
❌ Ignore customer communication
❌ Rush through return approvals

---

## 🔍 Where to Find Things

### Customer Info
- Top left card in order details
- Shows name, phone, email

### Delivery Address
- Top right card in order details
- Shows full address

### Order Items
- Middle section
- Shows all products

### Order Timeline
- Bottom section
- Shows all actions taken

### Actions
- Bottom of dialog
- Changes based on status

---

## 📊 Order Timeline

The timeline shows:
- ✅ Order created
- 💳 Payment status changes
- 📦 Status changes
- 🚚 Delivery assignments
- ⚠️ Delivery attempts
- ⏸️ Hold/release actions
- ❌ Cancellations
- 🔄 Return actions
- 💰 Refund actions
- 📞 Customer contacts
- 📝 Notes added

---

## 🆘 Need Help?

### Common Issues

**Q: Can't find "Start Preparing" button?**
A: Check order status - button only shows for CONFIRMED orders

**Q: How to reschedule delivery?**
A: Click "Retry Delivery" after recording attempt

**Q: Customer wants to cancel?**
A: Click "Cancel Order" and add reason

**Q: How to approve return?**
A: Click "Approve Return" when status is RETURN_REQUESTED

**Q: Refund not showing?**
A: Refund only available after return is RETURNED

---

## 📱 Quick Keyboard Shortcuts

- **ESC** - Close dialog
- **TAB** - Navigate between fields
- **ENTER** - Submit form (when in text field)

---

## 🎯 Success Metrics

Track these:
- ✅ Orders delivered on first attempt
- ✅ Average time from confirmed to delivered
- ✅ Return approval rate
- ✅ Refund processing time
- ✅ Customer communication response time

---

## 📞 Support Contacts

**Technical Issues:**
- Contact: IT Support
- Email: support@example.com

**Operations Questions:**
- Contact: Operations Manager
- Email: ops@example.com

**Payment Issues:**
- Contact: Finance Team
- Email: finance@example.com

---

## 🎉 Remember

- **Customer First** - Always try to resolve issues
- **Communication** - Keep customers informed
- **Documentation** - Add notes for everything
- **Efficiency** - Use hold instead of cancel
- **Quality** - Check orders before marking ready

---

**Print this card and keep it handy!** 📋
