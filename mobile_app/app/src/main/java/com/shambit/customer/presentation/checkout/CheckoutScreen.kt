package com.shambit.customer.presentation.checkout

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.data.remote.dto.response.CartDto
import com.shambit.customer.data.remote.dto.response.CartItemDto
import com.shambit.customer.domain.model.Address
import com.shambit.customer.ui.components.AddressCard
import com.shambit.customer.ui.components.AddressSelectionBottomSheet

/**
 * CheckoutScreen composable for order checkout with address integration
 * 
 * Features:
 * - Display default address with "Change" button
 * - Address selection via bottom sheet
 * - Immediate address updates without page reload
 * - "Proceed to Pay" button with address locking
 * - No address state handling with disabled pay button
 * - Address lock loading state and error handling
 * - Cart preservation during all address operations
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 8.1, 8.2, 8.3, 9.1
 * 
 * @param onNavigateBack Callback for back navigation
 * @param onNavigateToAddAddress Callback to navigate to add address screen
 * @param onNavigateToManageAddresses Callback to navigate to manage addresses screen
 * @param onNavigateToPayment Callback to navigate to payment screen
 * @param viewModel CheckoutViewModel instance
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    onNavigateBack: () -> Unit,
    onNavigateToAddAddress: () -> Unit,
    onNavigateToManageAddresses: () -> Unit,
    onNavigateToPayment: (orderId: String, razorpayOrderId: String, amount: Double) -> Unit,
    viewModel: CheckoutViewModel = hiltViewModel()
) {
    val selectedAddress by viewModel.selectedAddress.collectAsState()
    val addresses by viewModel.addresses.collectAsState()
    val cartItems by viewModel.cartItems.collectAsState()
    val addressLockState by viewModel.addressLockState.collectAsState()
    val checkoutState by viewModel.checkoutState.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    
    val snackbarHostState = remember { SnackbarHostState() }
    var showAddressBottomSheet by remember { mutableStateOf(false) }
    
    // Handle error messages
    LaunchedEffect(error) {
        error?.let { errorMessage ->
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.clearError()
        }
    }
    
    // Handle successful address lock - navigate to payment
    LaunchedEffect(addressLockState) {
        if (addressLockState is AddressLockState.Locked) {
            val cart = cartItems
            if (cart != null) {
                // Navigate to payment with cart details
                // For now, we'll use placeholder values - these should come from order creation
                onNavigateToPayment("temp_order_id", "temp_razorpay_id", cart.totalAmount)
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Checkout",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    // Refresh button
                    IconButton(
                        onClick = { viewModel.refreshCheckoutData() },
                        enabled = !isLoading
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Refresh"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                CheckoutContent(
                    selectedAddress = selectedAddress,
                    cartItems = cartItems,
                    checkoutState = checkoutState,
                    addressLockState = addressLockState,
                    onChangeAddress = { showAddressBottomSheet = true },
                    onProceedToPayment = { viewModel.proceedToPayment() },
                    onAddAddress = onNavigateToAddAddress
                )
            }
        }
    }
    
    // Address Selection Bottom Sheet
    if (showAddressBottomSheet) {
        AddressSelectionBottomSheet(
            addresses = addresses,
            selectedAddressId = selectedAddress?.id,
            onAddressSelected = { address ->
                viewModel.selectAddress(address)
                showAddressBottomSheet = false
            },
            onAddNewAddress = {
                showAddressBottomSheet = false
                onNavigateToAddAddress()
            },
            onManageAddresses = {
                showAddressBottomSheet = false
                onNavigateToManageAddresses()
            },
            onDismiss = { showAddressBottomSheet = false }
        )
    }
}

/**
 * Main content of the checkout screen
 */
@Composable
private fun CheckoutContent(
    selectedAddress: Address?,
    cartItems: CartDto?,
    checkoutState: CheckoutState,
    addressLockState: AddressLockState,
    onChangeAddress: () -> Unit,
    onProceedToPayment: () -> Unit,
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Address Section
        item {
            AddressSection(
                selectedAddress = selectedAddress,
                hasAddress = checkoutState.hasAddress,
                isAddressLocked = checkoutState.isAddressLocked,
                onChangeAddress = onChangeAddress,
                onAddAddress = onAddAddress
            )
        }
        
        // Cart Items Section
        if (cartItems != null && cartItems.items.isNotEmpty()) {
            item {
                CartItemsSection(cartItems = cartItems)
            }
        }
        
        // Price Breakdown Section
        if (cartItems != null) {
            item {
                PriceBreakdownSection(cartItems = cartItems)
            }
        }
        
        // Proceed to Payment Section
        item {
            ProceedToPaymentSection(
                canProceedToPayment = checkoutState.canProceedToPayment,
                addressLockState = addressLockState,
                totalAmount = checkoutState.totalAmount,
                onProceedToPayment = onProceedToPayment
            )
        }
    }
}

/**
 * Address section of checkout
 */
@Composable
private fun AddressSection(
    selectedAddress: Address?,
    hasAddress: Boolean,
    isAddressLocked: Boolean,
    onChangeAddress: () -> Unit,
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Section header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Delivery address",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Delivery Address",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                
                // Lock indicator when address is locked
                if (isAddressLocked) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Address locked",
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Locked",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            if (hasAddress && selectedAddress != null) {
                // Display selected address
                AddressCard(
                    address = selectedAddress,
                    isSelected = false,
                    showActions = false
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Change address button (only if not locked)
                if (!isAddressLocked) {
                    OutlinedButton(
                        onClick = onChangeAddress,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Change address",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Change Address")
                    }
                }
            } else {
                // No address state
                NoAddressState(onAddAddress = onAddAddress)
            }
        }
    }
}

/**
 * No address state component
 */
@Composable
private fun NoAddressState(
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // No address icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .background(
                    MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f),
                    RoundedCornerShape(24.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = "No address",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(24.dp)
            )
        }
        
        // No address text
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "No Delivery Address",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            
            Text(
                text = "Please add delivery address to continue",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
        
        // Add address button
        Button(
            onClick = onAddAddress,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Add Delivery Address")
        }
    }
}

/**
 * Cart items section
 */
@Composable
private fun CartItemsSection(
    cartItems: CartDto,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Section header
            Text(
                text = "Order Items (${cartItems.itemCount})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Cart items
            cartItems.items.forEach { item ->
                CartItemRow(item = item)
                if (item != cartItems.items.last()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

/**
 * Individual cart item row
 */
@Composable
private fun CartItemRow(
    item: CartItemDto,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = item.product.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            
            Text(
                text = "Qty: ${item.quantity}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        Spacer(modifier = Modifier.width(8.dp))
        
        Text(
            text = "₹${item.addedPrice * item.quantity}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

/**
 * Price breakdown section
 */
@Composable
private fun PriceBreakdownSection(
    cartItems: CartDto,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "Price Details",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Subtotal
            PriceRow(
                label = "Subtotal",
                value = "₹${cartItems.subtotal}"
            )
            
            // Delivery charges
            PriceRow(
                label = "Delivery Charges",
                value = if (cartItems.deliveryFee > 0) "₹${cartItems.deliveryFee}" else "FREE"
            )
            
            // Discount
            if (cartItems.discountAmount > 0) {
                PriceRow(
                    label = "Discount",
                    value = "-₹${cartItems.discountAmount}",
                    valueColor = MaterialTheme.colorScheme.primary
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Total
            PriceRow(
                label = "Total Amount",
                value = "₹${cartItems.totalAmount}",
                labelStyle = MaterialTheme.typography.titleMedium,
                valueStyle = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * Price row component
 */
@Composable
private fun PriceRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    labelStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.bodyMedium,
    valueStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.bodyMedium,
    fontWeight: FontWeight = FontWeight.Normal,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = labelStyle,
            fontWeight = fontWeight,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Text(
            text = value,
            style = valueStyle,
            fontWeight = fontWeight,
            color = valueColor
        )
    }
}

/**
 * Proceed to payment section
 */
@Composable
private fun ProceedToPaymentSection(
    canProceedToPayment: Boolean,
    addressLockState: AddressLockState,
    totalAmount: Double,
    onProceedToPayment: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isLocking = addressLockState is AddressLockState.Locking
    
    // Animation for button state
    val buttonAlpha by animateFloatAsState(
        targetValue = if (canProceedToPayment && !isLocking) 1f else 0.6f,
        animationSpec = tween(durationMillis = 200),
        label = "proceed_button_alpha"
    )
    
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Total amount display
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Total Amount",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Text(
                    text = "₹$totalAmount",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            // Proceed to payment button
            Button(
                onClick = onProceedToPayment,
                enabled = canProceedToPayment && !isLocking,
                modifier = Modifier
                    .fillMaxWidth()
                    .graphicsLayer { alpha = buttonAlpha },
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isLocking) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Processing...")
                } else {
                    Text(
                        text = if (canProceedToPayment) "Proceed to Pay" else "Add Address to Continue",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            
            // Address lock error message
            if (addressLockState is AddressLockState.LockFailed) {
                AnimatedVisibility(
                    visible = true,
                    enter = slideInVertically() + fadeIn(),
                    exit = slideOutVertically() + fadeOut()
                ) {
                    Text(
                        text = addressLockState.error,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}