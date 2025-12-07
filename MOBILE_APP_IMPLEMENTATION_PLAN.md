# Mobile App Order Processing - Implementation Plan

## ✅ Completed (Just Now)

### 1. Data Models Updated
- ✅ **OrderDto** - Added 18 new fields for hold, delivery, return, and refund management
- ✅ **Order Status Comment** - Updated to document all 20 statuses
- ✅ **Payment Status Comment** - Updated to document all 9 payment statuses
- ✅ **Timeline Action Type Comment** - Updated to document all 18 action types

### 2. API Integration
- ✅ **ReturnRequestRequest** - New DTO for return requests
- ✅ **OrderApi.requestReturn()** - New API endpoint
- ✅ **OrderRepository.requestReturn()** - New repository method

### 3. Utility Classes
- ✅ **OrderStatusUtil.kt** - Complete utility with:
  - `getStatusInfo()` - All 20 statuses with colors and descriptions
  - `canRequestReturn()` - 7-day return window check
  - `canCancelOrder()` - Cancel eligibility check
  - `canContactDeliveryPerson()` - Contact availability check
  - `isActiveDelivery()` - Active delivery state check
  - `isInReturnFlow()` - Return/refund flow check
  - `isTerminalStatus()` - Terminal state check
  - `getActionTypeDisplayName()` - All 18 action types
  - `getPaymentStatusInfo()` - All 9 payment statuses

---

## 🚧 Next Steps (To Be Implemented)

### Phase 1: Update Existing UI Components (2-3 hours)

#### 1.1 Update OrdersScreen.kt
**File:** `mobile_app/app/src/main/java/com/shambit/customer/presentation/orders/list/OrdersScreen.kt`

**Changes Needed:**
```kotlin
// Replace OrderStatusBadge function with:
@Composable
private fun OrderStatusBadge(status: String) {
    val statusInfo = OrderStatusUtil.getStatusInfo(status)
    
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(statusInfo.color)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = statusInfo.displayName,
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontWeight = FontWeight.Medium
        )
    }
}
```

#### 1.2 Update OrderDetailScreen.kt
**File:** `mobile_app/app/src/main/java/com/shambit/customer/presentation/orders/detail/OrderDetailScreen.kt`

**Changes Needed:**

**A. Update OrderStatusBadge (line ~280)**
```kotlin
@Composable
private fun OrderStatusBadge(status: String) {
    val statusInfo = OrderStatusUtil.getStatusInfo(status)
    
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(statusInfo.color)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = statusInfo.displayName,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
    }
}
```

**B. Update TimelineItemFromHistory (line ~420)**
```kotlin
@Composable
private fun TimelineItemFromHistory(
    historyItem: OrderHistoryDto,
    isLast: Boolean
) {
    val title = OrderStatusUtil.getActionTypeDisplayName(
        historyItem.actionType,
        historyItem.newValue
    )
    val description = historyItem.reason ?: historyItem.note
    
    TimelineItem(
        title = title,
        time = formatDate(historyItem.createdAt),
        description = description,
        isCompleted = true,
        isLast = isLast
    )
}
```

**C. Update PaymentDetailsCard (line ~700)**
```kotlin
// Replace payment status display with:
val (statusText, statusColor) = OrderStatusUtil.getPaymentStatusInfo(order.paymentStatus)

Text(
    statusText,
    style = MaterialTheme.typography.bodyMedium,
    fontWeight = FontWeight.Bold,
    color = statusColor
)
```

**D. Update OrderActionButtons (line ~850)**
```kotlin
@Composable
private fun OrderActionButtons(
    order: OrderDto,
    onCancelOrder: () -> Unit,
    onReorder: () -> Unit,
    onRequestReturn: () -> Unit,
    onContactSupport: () -> Unit
) {
    val canCancel = OrderStatusUtil.canCancelOrder(order.status)
    val canReorder = order.status.lowercase() in listOf("delivered", "canceled", "cancelled")
    val canReturn = OrderStatusUtil.canRequestReturn(order)
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Return Request button (NEW)
        if (canReturn) {
            Button(
                onClick = onRequestReturn,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.tertiary
                )
            ) {
                Icon(Icons.Default.KeyboardReturn, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Request Return")
            }
        }
        
        // Reorder button
        if (canReorder) {
            Button(
                onClick = onReorder,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.ShoppingCart, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Reorder")
            }
        }
        
        // Cancel Order button
        if (canCancel) {
            OutlinedButton(
                onClick = onCancelOrder,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.Close, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Cancel Order")
            }
        }
        
        // Help/Contact Support button
        OutlinedButton(
            onClick = onContactSupport,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.Info, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Contact Support")
        }
    }
}
```

---

### Phase 2: Add New UI Components (3-4 hours)

#### 2.1 Add Information Cards to OrderDetailScreen.kt

**Add after OrderTimelineCard (around line 200):**

```kotlin
// Hold Information Card
if (order.status.lowercase() == "on_hold" && !order.onHoldReason.isNullOrBlank()) {
    item {
        InfoCard(
            title = "Order On Hold",
            message = order.onHoldReason,
            icon = Icons.Default.Pause,
            backgroundColor = MaterialTheme.colorScheme.warningContainer,
            iconColor = MaterialTheme.colorScheme.onWarningContainer
        )
    }
}

// Delivery Attempt Information
if (order.deliveryAttemptCount != null && order.deliveryAttemptCount > 0) {
    item {
        InfoCard(
            title = "Delivery Attempts: ${order.deliveryAttemptCount}",
            message = order.deliveryFailureReason ?: "Delivery will be retried soon",
            icon = Icons.Default.LocalShipping,
            backgroundColor = MaterialTheme.colorScheme.warningContainer,
            iconColor = MaterialTheme.colorScheme.onWarningContainer
        )
    }
}

// Delivery Tracking Card
if (OrderStatusUtil.isActiveDelivery(order.status)) {
    item {
        DeliveryTrackingCard(
            order = order,
            deliveryTracking = state.deliveryTracking,
            onContactDeliveryPerson = {
                // TODO: Implement call functionality
            }
        )
    }
}

// Refund Status Card
if (order.status.lowercase() in listOf("refund_pending", "refunded")) {
    item {
        RefundStatusCard(order = order)
    }
}
```

#### 2.2 Create InfoCard Composable

**Add to OrderDetailScreen.kt:**

```kotlin
@Composable
private fun InfoCard(
    title: String,
    message: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    backgroundColor: Color,
    iconColor: Color
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(24.dp)
            )
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = iconColor
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = iconColor.copy(alpha = 0.8f)
                )
            }
        }
    }
}
```

#### 2.3 Create DeliveryTrackingCard Composable

**Add to OrderDetailScreen.kt:**

```kotlin
@Composable
private fun DeliveryTrackingCard(
    order: OrderDto,
    deliveryTracking: DeliveryDto?,
    onContactDeliveryPerson: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Delivery Tracking",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            if (deliveryTracking?.deliveryPersonnel != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = deliveryTracking.deliveryPersonnel.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = deliveryTracking.deliveryPersonnel.mobileNumber,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    if (OrderStatusUtil.canContactDeliveryPerson(order)) {
                        IconButton(onClick = onContactDeliveryPerson) {
                            Icon(
                                imageVector = Icons.Default.Phone,
                                contentDescription = "Call delivery person",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
                
                if (deliveryTracking.estimatedDeliveryTime != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Estimated arrival: ${formatDate(deliveryTracking.estimatedDeliveryTime)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                Text(
                    text = "Delivery person will be assigned soon",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
```

#### 2.4 Create RefundStatusCard Composable

**Add to OrderDetailScreen.kt:**

```kotlin
@Composable
private fun RefundStatusCard(order: OrderDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (order.status.lowercase() == "refunded") 
                        "Refund Completed" else "Refund Processing",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Icon(
                    imageVector = if (order.status.lowercase() == "refunded") 
                        Icons.Default.CheckCircle else Icons.Default.Schedule,
                    contentDescription = null,
                    tint = if (order.status.lowercase() == "refunded")
                        MaterialTheme.colorScheme.primary 
                    else MaterialTheme.colorScheme.tertiary
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            if (order.refundAmount != null) {
                Text(
                    text = "Refund Amount: ${formatCurrency(order.refundAmount)}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
            }
            
            if (!order.refundReference.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Reference: ${order.refundReference}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.7f)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = if (order.status.lowercase() == "refunded")
                    "The refund has been processed to your original payment method"
                else
                    "Your refund is being processed and will be credited within 5-7 business days",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
            )
        }
    }
}
```

#### 2.5 Create ReturnRequestDialog Composable

**Add to OrderDetailScreen.kt:**

```kotlin
@Composable
private fun ReturnRequestDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var selectedReason by remember { mutableStateOf("") }
    var customReason by remember { mutableStateOf("") }
    
    val returnReasons = listOf(
        "Product quality issue",
        "Wrong item delivered",
        "Damaged during delivery",
        "Not as described",
        "Changed my mind",
        "Other"
    )
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Request Return") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                Text("Please select a reason for return:")
                Spacer(modifier = Modifier.height(16.dp))
                
                returnReasons.forEach { reason ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedReason = reason }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedReason == reason,
                            onClick = { selectedReason = reason }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(reason)
                    }
                }
                
                if (selectedReason == "Other") {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = customReason,
                        onValueChange = { customReason = it },
                        label = { Text("Please specify") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalReason = if (selectedReason == "Other") customReason else selectedReason
                    onConfirm(finalReason)
                },
                enabled = selectedReason.isNotEmpty() && 
                         (selectedReason != "Other" || customReason.isNotBlank())
            ) {
                Text("Submit Request")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
```

---

### Phase 3: Update ViewModel (1 hour)

#### 3.1 Update OrderDetailViewModel.kt

**Add return request functionality:**

```kotlin
// Add to OrderDetailViewModel class

fun requestReturn(reason: String) {
    val orderId = _state.value.order?.id ?: return
    
    viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        
        when (val result = orderRepository.requestReturn(orderId, reason)) {
            is NetworkResult.Success -> {
                _state.update {
                    it.copy(
                        order = result.data,
                        isLoading = false
                    )
                }
            }
            is NetworkResult.Error -> {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
            is NetworkResult.Loading -> {
                // Already handled above
            }
        }
    }
}

// Add auto-refresh for active orders
fun startOrderTracking(orderId: String) {
    viewModelScope.launch {
        while (true) {
            val currentStatus = _state.value.order?.status?.lowercase()
            if (currentStatus in listOf(
                "preparing", "ready_for_pickup", "out_for_delivery", "delivery_attempted"
            )) {
                delay(30000) // 30 seconds
                loadOrderDetail(orderId)
            } else {
                break
            }
        }
    }
}
```

---

### Phase 4: Wire Everything Together (1 hour)

#### 4.1 Update OrderDetailScreen.kt Main Composable

**Add state for return dialog:**

```kotlin
var showReturnDialog by remember { mutableStateOf(false) }
var showReturnSuccess by remember { mutableStateOf(false) }
```

**Add return dialog:**

```kotlin
if (showReturnDialog) {
    ReturnRequestDialog(
        onDismiss = { showReturnDialog = false },
        onConfirm = { reason ->
            viewModel.requestReturn(reason)
            showReturnDialog = false
            showReturnSuccess = true
        }
    )
}
```

**Update OrderDetailContent call:**

```kotlin
OrderDetailContent(
    order = state.order!!,
    onCancelOrder = { showCancelDialog = true },
    onReorder = {
        viewModel.reorder()
        showReorderSuccess = true
    },
    onRequestReturn = { showReturnDialog = true }, // NEW
    onContactSupport = {
        // TODO: Implement contact support
    },
    onNavigateToProduct = onNavigateToProduct
)
```

**Start auto-tracking:**

```kotlin
LaunchedEffect(orderId) {
    viewModel.loadOrderDetail(orderId)
    viewModel.startOrderTracking(orderId) // NEW
}
```

---

## 📋 Testing Checklist

After implementation, test these scenarios:

### Status Display
- [ ] All 20 statuses display with correct colors
- [ ] Status badges show correct text
- [ ] Status descriptions are clear

### Timeline
- [ ] All 18 action types display correctly
- [ ] Timeline shows complete history
- [ ] Timestamps format correctly

### Return Functionality
- [ ] Return button shows only for delivered orders within 7 days
- [ ] Return dialog shows all reasons
- [ ] Return request submits successfully
- [ ] Status updates to "return_requested"

### Information Cards
- [ ] Hold card shows when order is on hold
- [ ] Delivery attempt card shows attempt count
- [ ] Delivery tracking shows delivery person info
- [ ] Refund card shows refund status

### Auto-refresh
- [ ] Active orders refresh every 30 seconds
- [ ] Status updates appear automatically
- [ ] No refresh for terminal statuses

---

## 📊 Estimated Time

- **Phase 1:** 2-3 hours (Update existing UI)
- **Phase 2:** 3-4 hours (Add new components)
- **Phase 3:** 1 hour (Update ViewModel)
- **Phase 4:** 1 hour (Wire everything)
- **Testing:** 2 hours

**Total:** 9-11 hours of development time

---

## 🎯 Priority Order

1. **CRITICAL** - Update OrderStatusBadge in both screens (30 min)
2. **CRITICAL** - Update timeline action types (30 min)
3. **HIGH** - Add return request functionality (2 hours)
4. **HIGH** - Add information cards (2 hours)
5. **MEDIUM** - Add delivery tracking card (1 hour)
6. **MEDIUM** - Add refund status card (1 hour)
7. **LOW** - Add auto-refresh (1 hour)

---

## 🚀 Next Action

**Start with Phase 1.1 and 1.2** - Update the status badges in both screens to use `OrderStatusUtil`. This is the quickest win and will immediately show all 20 statuses correctly!

The foundation is now complete. All data models, API integration, and utility functions are ready. Just need to update the UI components to use them! 🎉
