package com.shambit.customer.presentation.checkout.summary

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
// Theme colors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderSummaryScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPayment: (orderId: String, razorpayOrderId: String?, amount: Double) -> Unit,
    viewModel: OrderSummaryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadOrderSummary()
    }
    
    // Handle order creation success
    LaunchedEffect(uiState.orderCreated) {
        if (uiState.orderCreated && uiState.createdOrder != null) {
            val order = uiState.createdOrder!!
            onNavigateToPayment(
                order.order.id,
                order.paymentDetails?.razorpayOrderId,
                order.order.totalAmount
            )
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order Summary") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF10B981),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            if (!uiState.isLoading && uiState.cart != null) {
                OrderSummaryBottomBar(
                    totalAmount = uiState.cart!!.totalAmount,
                    isPlacingOrder = uiState.isPlacingOrder,
                    onPlaceOrder = { viewModel.placeOrder() }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                
                uiState.error != null -> {
                    ErrorContent(
                        error = uiState.error!!,
                        onRetry = { viewModel.loadOrderSummary() },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                
                uiState.cart != null && uiState.selectedAddress != null -> {
                    OrderSummaryContent(
                        uiState = uiState,
                        onPaymentMethodSelected = { viewModel.selectPaymentMethod(it) },
                        onPromoCodeApplied = { viewModel.applyPromoCode(it) },
                        onPromoCodeRemoved = { viewModel.removePromoCode() }
                    )
                }
            }
        }
    }
}

@Composable
private fun OrderSummaryContent(
    uiState: OrderSummaryUiState,
    onPaymentMethodSelected: (String) -> Unit,
    onPromoCodeApplied: (String) -> Unit,
    onPromoCodeRemoved: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Cart Items
        item {
            Text(
                text = "Items (${uiState.cart!!.itemCount})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        
        items(uiState.cart!!.items) { item ->
            CartItemCard(item = item)
        }
        
        // Delivery Address
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Delivery Address",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        
        item {
            DeliveryAddressCard(address = uiState.selectedAddress!!)
        }
        
        // Promo Code
        item {
            Spacer(modifier = Modifier.height(8.dp))
            PromoCodeSection(
                currentPromoCode = uiState.cart!!.promoCode,
                onApply = onPromoCodeApplied,
                onRemove = onPromoCodeRemoved
            )
        }
        
        // Price Breakdown
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Price Details",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        
        item {
            PriceBreakdownCard(cart = uiState.cart!!)
        }
        
        // Payment Method
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Payment Method",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
        
        item {
            PaymentMethodSelector(
                selectedMethod = uiState.selectedPaymentMethod,
                onMethodSelected = onPaymentMethodSelected
            )
        }
        
        // Bottom spacing for bottom bar
        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun CartItemCard(item: com.shambit.customer.data.remote.dto.response.CartItemDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Product Image
            AsyncImage(
                model = item.product.imageUrls.firstOrNull(),
                contentDescription = item.product.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFF5F5F5)),
                contentScale = ContentScale.Crop
            )
            
            // Product Details
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Qty: ${item.quantity}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                    
                    Text(
                        text = "₹${item.addedPrice * item.quantity}",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF10B981)
                    )
                }
            }
        }
    }
}

@Composable
private fun DeliveryAddressCard(address: com.shambit.customer.data.remote.dto.response.AddressDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                tint = Color(0xFF10B981),
                modifier = Modifier.size(24.dp)
            )
            
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = (address.type ?: "other").replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    if (address.isDefault) {
                        Surface(
                            color = Color(0xFF10B981).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Default",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = buildString {
                        append(address.addressLine1)
                        if (!address.addressLine2.isNullOrBlank()) {
                            append(", ${address.addressLine2}")
                        }
                        append(", ${address.city}")
                        append(", ${address.state} ${address.pincode}")
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
private fun PromoCodeSection(
    currentPromoCode: String?,
    onApply: (String) -> Unit,
    onRemove: () -> Unit
) {
    var promoCode by remember { mutableStateOf("") }
    var showInput by remember { mutableStateOf(currentPromoCode == null) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            if (currentPromoCode != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = currentPromoCode,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4CAF50)
                        )
                    }
                    
                    TextButton(onClick = onRemove) {
                        Text("Remove")
                    }
                }
            } else if (showInput) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = promoCode,
                        onValueChange = { promoCode = it.uppercase() },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Enter promo code") },
                        singleLine = true
                    )
                    
                    Button(
                        onClick = {
                            if (promoCode.isNotBlank()) {
                                onApply(promoCode)
                            }
                        },
                        enabled = promoCode.isNotBlank()
                    ) {
                        Text("Apply")
                    }
                }
            } else {
                TextButton(
                    onClick = { showInput = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Apply Promo Code")
                }
            }
        }
    }
}

@Composable
private fun PriceBreakdownCard(cart: com.shambit.customer.data.remote.dto.response.CartDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            PriceRow("Subtotal", cart.subtotal)
            PriceRow("Delivery Fee", cart.deliveryFee)
            PriceRow("Tax", cart.taxAmount)
            
            if (cart.discountAmount > 0) {
                PriceRow("Discount", -cart.discountAmount, color = Color(0xFF4CAF50))
            }
            
            HorizontalDivider()
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Total Amount",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "₹${cart.totalAmount}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981)
                )
            }
        }
    }
}

@Composable
private fun PriceRow(
    label: String,
    amount: Double,
    color: Color = Color.Black
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray
        )
        Text(
            text = "₹${kotlin.math.abs(amount)}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = color
        )
    }
}

@Composable
private fun PaymentMethodSelector(
    selectedMethod: String,
    onMethodSelected: (String) -> Unit
) {
    val paymentMethods = listOf(
        PaymentMethod("upi", "UPI", Icons.Default.AccountBox),
        PaymentMethod("card", "Credit/Debit Card", Icons.Default.AccountBox),
        PaymentMethod("netbanking", "Net Banking", Icons.Default.AccountBox),
        PaymentMethod("wallet", "Wallet", Icons.Default.AccountBox),
        PaymentMethod("cod", "Cash on Delivery", Icons.Default.AccountBox)
    )
    
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        paymentMethods.forEach { method ->
            PaymentMethodCard(
                method = method,
                isSelected = selectedMethod == method.id,
                onSelected = { onMethodSelected(method.id) }
            )
        }
    }
}

@Composable
private fun PaymentMethodCard(
    method: PaymentMethod,
    isSelected: Boolean,
    onSelected: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelected)
            .then(
                if (isSelected) {
                    Modifier.border(
                        width = 2.dp,
                        color = Color(0xFF10B981),
                        shape = RoundedCornerShape(8.dp)
                    )
                } else {
                    Modifier
                }
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                Color(0xFF10B981).copy(alpha = 0.05f)
            } else {
                Color.White
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = method.icon,
                contentDescription = null,
                tint = if (isSelected) Color(0xFF10B981) else Color.Gray,
                modifier = Modifier.size(24.dp)
            )
            
            Text(
                text = method.name,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) Color(0xFF10B981) else Color.Black,
                modifier = Modifier.weight(1f)
            )
            
            RadioButton(
                selected = isSelected,
                onClick = onSelected
            )
        }
    }
}

@Composable
private fun OrderSummaryBottomBar(
    totalAmount: Double,
    isPlacingOrder: Boolean,
    onPlaceOrder: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 8.dp,
        color = Color.White
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Total Amount",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
                Text(
                    text = "₹$totalAmount",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF10B981)
                )
            }
            
            Button(
                onClick = onPlaceOrder,
                enabled = !isPlacingOrder,
                modifier = Modifier.height(48.dp)
            ) {
                if (isPlacingOrder) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Place Order")
                }
            }
        }
    }
}

@Composable
private fun ErrorContent(
    error: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Warning,
            contentDescription = null,
            tint = Color.Red,
            modifier = Modifier.size(48.dp)
        )
        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = Color.Gray
        )
        Button(onClick = onRetry) {
            Text("Retry")
        }
    }
}

private data class PaymentMethod(
    val id: String,
    val name: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)
