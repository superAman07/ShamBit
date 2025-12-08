package com.shambit.customer.presentation.orders.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.remote.dto.response.OrderDto
import com.shambit.customer.data.remote.dto.response.OrderHistoryDto
import com.shambit.customer.data.remote.dto.response.OrderItemDto
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.util.ImageUrlHelper
import com.shambit.customer.util.OrderStatusUtil
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Call
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    orderId: String,
    onNavigateBack: () -> Unit,
    onNavigateToProduct: (String) -> Unit,
    viewModel: OrderDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showCancelDialog by remember { mutableStateOf(false) }
    var showReorderSuccess by remember { mutableStateOf(false) }
    var showCancelSuccess by remember { mutableStateOf(false) }
    var showReturnDialog by remember { mutableStateOf(false) }
    var showReturnSuccess by remember { mutableStateOf(false) }
    
    LaunchedEffect(orderId) {
        viewModel.loadOrderDetail(orderId)
        viewModel.startOrderTracking(orderId)
    }
    
    // Navigate back after successful cancellation
    LaunchedEffect(state.order?.status) {
        if (state.order?.status == "canceled" && showCancelSuccess) {
            kotlinx.coroutines.delay(1500)
            onNavigateBack()
        }
    }
    
    // Show snackbar for reorder success
    LaunchedEffect(showReorderSuccess) {
        if (showReorderSuccess) {
            kotlinx.coroutines.delay(2000)
            showReorderSuccess = false
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order Details") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = {
            when {
                showReorderSuccess -> {
                    Snackbar(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text("Items added to cart successfully!")
                    }
                }
                showCancelSuccess -> {
                    Snackbar(
                        modifier = Modifier.padding(16.dp),
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Text("Order canceled successfully")
                    }
                }
                showReturnSuccess -> {
                    Snackbar(
                        modifier = Modifier.padding(16.dp),
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer
                    ) {
                        Text("Return request submitted successfully")
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading -> LoadingState()
                state.error != null -> ErrorState(
                    message = state.error ?: "Failed to load order",
                    onRetry = { viewModel.loadOrderDetail(orderId) }
                )
                state.order != null -> {
                    OrderDetailContent(
                        order = state.order!!,
                        deliveryTracking = state.deliveryTracking,
                        onCancelOrder = { showCancelDialog = true },
                        onReorder = {
                            viewModel.reorder()
                            showReorderSuccess = true
                        },
                        onRequestReturn = { showReturnDialog = true },
                        onContactSupport = {
                            // TODO: Implement contact support (phone/email/chat)
                        },
                        onNavigateToProduct = onNavigateToProduct
                    )
                }
            }
        }
    }
    
    if (showCancelDialog) {
        CancelOrderDialog(
            onDismiss = { showCancelDialog = false },
            onConfirm = { reason ->
                viewModel.cancelOrder(reason)
                showCancelDialog = false
                showCancelSuccess = true
            }
        )
    }
    
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
}

@Composable
private fun OrderDetailContent(
    order: OrderDto,
    deliveryTracking: com.shambit.customer.data.remote.dto.response.DeliveryDto?,
    onCancelOrder: () -> Unit,
    onReorder: () -> Unit,
    onRequestReturn: () -> Unit,
    onContactSupport: () -> Unit,
    onNavigateToProduct: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Order Header
        item {
            OrderHeaderCard(order = order)
        }
        
        // Order Status Timeline
        item {
            OrderTimelineCard(order = order)
        }
        
        // Hold Information Card
        if (order.status.lowercase() == "on_hold" && !order.onHoldReason.isNullOrBlank()) {
            item {
                InfoCard(
                    title = "Order On Hold",
                    message = order.onHoldReason,
                    icon = Icons.Default.Warning,
                    backgroundColor = MaterialTheme.colorScheme.tertiaryContainer,
                    iconColor = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
        }
        
        // Delivery Attempt Information
        if (order.deliveryAttemptCount != null && order.deliveryAttemptCount > 0) {
            item {
                InfoCard(
                    title = "Delivery Attempts: ${order.deliveryAttemptCount}",
                    message = order.deliveryFailureReason ?: "Delivery will be retried soon",
                    icon = Icons.Default.ShoppingCart,
                    backgroundColor = MaterialTheme.colorScheme.tertiaryContainer,
                    iconColor = MaterialTheme.colorScheme.onTertiaryContainer
                )
            }
        }
        
        // Delivery Tracking Card
        if (OrderStatusUtil.isActiveDelivery(order.status)) {
            item {
                DeliveryTrackingCard(
                    order = order,
                    deliveryTracking = deliveryTracking,
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
        
        // Order Items
        item {
            Text(
                text = "Order Items",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        
        items(order.items ?: emptyList()) { item ->
            OrderItemCard(
                item = item,
                onClick = { onNavigateToProduct(item.productId) }
            )
        }
        
        // Price Details
        item {
            PriceDetailsCard(order = order)
        }
        
        // Delivery Address
        if (order.deliveryAddress != null) {
            item {
                DeliveryAddressCard(address = order.deliveryAddress)
            }
        }
        
        // Payment Details
        item {
            PaymentDetailsCard(order = order)
        }
        
        // Action Buttons
        item {
            OrderActionButtons(
                order = order,
                onCancelOrder = onCancelOrder,
                onReorder = onReorder,
                onRequestReturn = onRequestReturn,
                onContactSupport = onContactSupport
            )
        }
        
        // Bottom spacing
        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun OrderHeaderCard(order: OrderDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
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
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Order #${order.orderNumber}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatDate(order.createdAt),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }
                
                OrderStatusBadge(status = order.status)
            }
        }
    }
}

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

@Composable
private fun OrderTimelineCard(order: OrderDto) {
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
                text = "Order Timeline",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Use timeline data if available, otherwise fall back to legacy logic
            if (!order.timeline.isNullOrEmpty()) {
                // New timeline implementation using backend data
                order.timeline.forEachIndexed { index, historyItem ->
                    val isLast = index == order.timeline.size - 1
                    TimelineItemFromHistory(
                        historyItem = historyItem,
                        isLast = isLast
                    )
                }
            } else {
                // Legacy fallback timeline (for backward compatibility)
                LegacyTimeline(order)
            }
        }
    }
}

@Composable
private fun LegacyTimeline(order: OrderDto) {
    // Order Placed
    TimelineItem(
        title = "Order Placed",
        time = formatDate(order.createdAt),
        description = null,
        isCompleted = true,
        isLast = false
    )
    
    // Confirmed
    if (order.confirmedAt != null) {
        TimelineItem(
            title = "Order Confirmed",
            time = formatDate(order.confirmedAt),
            description = null,
            isCompleted = true,
            isLast = false
        )
    }
    
    // Preparing/Out for Delivery
    when (order.status.lowercase()) {
        "preparing", "out_for_delivery", "delivered" -> {
            TimelineItem(
                title = if (order.status.lowercase() == "preparing") "Preparing Order" else "Out for Delivery",
                time = order.estimatedDeliveryTime?.let { "Est: ${formatDate(it)}" } ?: "In Progress",
                description = null,
                isCompleted = order.status.lowercase() in listOf("out_for_delivery", "delivered"),
                isLast = false
            )
        }
    }
    
    // Delivered
    if (order.deliveredAt != null) {
        TimelineItem(
            title = "Delivered",
            time = formatDate(order.deliveredAt),
            description = null,
            isCompleted = true,
            isLast = true
        )
    } else if (order.canceledAt != null) {
        TimelineItem(
            title = "Order Canceled",
            time = formatDate(order.canceledAt),
            description = null,
            isCompleted = true,
            isLast = true
        )
    }
}

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

@Composable
private fun TimelineItem(
    title: String,
    time: String,
    description: String? = null,
    isCompleted: Boolean,
    isLast: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(
                        if (isCompleted) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceVariant
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isCompleted) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(if (description != null) 56.dp else 40.dp)
                        .background(
                            if (isCompleted) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                )
            }
        }
        
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isCompleted) FontWeight.Bold else FontWeight.Normal,
                color = if (isCompleted) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = time,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            // Show description if available (reason, note, etc.)
            if (!description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                )
            }
            
            if (!isLast) {
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun OrderItemCard(
    item: OrderItemDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            AsyncImage(
                model = item.productImage?.let { ImageUrlHelper.getAbsoluteUrl(it) },
                contentDescription = item.productName,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentScale = ContentScale.Crop
            )
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = item.productName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "Qty: ${item.quantity}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = formatCurrency(item.totalPrice),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun PriceDetailsCard(order: OrderDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Price Details",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            HorizontalDivider()
            
            PriceRow("Subtotal", order.subtotal)
            
            if (order.discountAmount > 0) {
                PriceRow("Discount", -order.discountAmount, isDiscount = true)
            }
            
            if (order.taxAmount > 0) {
                PriceRow("Tax", order.taxAmount)
            }
            
            if (order.deliveryFee > 0) {
                PriceRow("Delivery Fee", order.deliveryFee)
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Delivery Fee", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "FREE",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            HorizontalDivider()
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "Total Amount",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    formatCurrency(order.totalAmount),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun PriceRow(label: String, amount: Double, isDiscount: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            if (isDiscount) "-${formatCurrency(-amount)}" else formatCurrency(amount),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = if (isDiscount) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun DeliveryAddressCard(address: AddressDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "Delivery Address",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = address.addressLine1,
                    style = MaterialTheme.typography.bodyMedium
                )
                
                if (!address.addressLine2.isNullOrBlank()) {
                    Text(
                        text = address.addressLine2,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                if (!address.landmark.isNullOrBlank()) {
                    Text(
                        text = "Landmark: ${address.landmark}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Text(
                    text = "${address.city}, ${address.state} - ${address.pincode}",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun PaymentDetailsCard(order: OrderDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "Payment Details",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Payment Method",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        order.paymentMethod.replace("_", " ").capitalize(),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Payment Status",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    val (statusText, statusColor) = OrderStatusUtil.getPaymentStatusInfo(order.paymentStatus)
                    
                    Text(
                        statusText,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
                
                if (!order.paymentId.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Payment ID: ${order.paymentId}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

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
        // Return Request button (NEW - for delivered orders within 7 days)
        if (canReturn) {
            Button(
                onClick = onRequestReturn,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.tertiary
                )
            ) {
                Icon(Icons.Default.KeyboardArrowLeft, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Request Return")
            }
        }
        
        // Reorder button (for delivered/canceled orders)
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
        
        // Cancel Order button (only for eligible orders)
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

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.error
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

@Composable
private fun CancelOrderDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var reason by remember { mutableStateOf("") }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel Order") },
        text = {
            Column {
                Text("Are you sure you want to cancel this order?")
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Reason (optional)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { 
                    val finalReason = reason.ifBlank { "Customer requested cancellation" }
                    onConfirm(finalReason) 
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Cancel Order")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Keep Order")
            }
        }
    )
}

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

@Composable
private fun DeliveryTrackingCard(
    order: OrderDto,
    deliveryTracking: com.shambit.customer.data.remote.dto.response.DeliveryDto?,
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
                                imageVector = Icons.Default.Call,
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
                        Icons.Default.CheckCircle else Icons.Default.Info,
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

private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        date?.let { outputFormat.format(it) } ?: dateString
    } catch (e: Exception) {
        dateString
    }
}

private fun formatCurrency(amount: Double): String {
    return "₹${String.format("%.2f", amount)}"
}

private fun String.capitalize(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
}
