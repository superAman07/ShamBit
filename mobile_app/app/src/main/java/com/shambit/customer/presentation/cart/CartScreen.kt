package com.shambit.customer.presentation.cart

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.CartItemDto
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.util.ImageUrlHelper

/**
 * Cart Screen
 * Displays user's shopping cart with items, pricing, and checkout
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    viewModel: CartViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToCheckout: () -> Unit = {},
    onNavigateToProduct: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val pullToRefreshState = rememberPullToRefreshState()
    
    // Handle pull-to-refresh
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            viewModel.refreshCart()
        }
    }
    
    // Reset pull-to-refresh state
    LaunchedEffect(uiState.isRefreshing) {
        if (!uiState.isRefreshing) {
            pullToRefreshState.endRefresh()
        }
    }
    
    // Show error snackbar
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "My Cart",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            // Show checkout bar only when cart has items
            val cart = uiState.cart
            if (!uiState.isLoading && cart != null && cart.items.isNotEmpty()) {
                CheckoutBar(
                    totalAmount = cart.totalAmount,
                    itemCount = cart.itemCount,
                    onCheckout = onNavigateToCheckout
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .nestedScroll(pullToRefreshState.nestedScrollConnection)
        ) {
            val cart = uiState.cart
            when {
                uiState.isLoading && cart == null -> {
                    LoadingState()
                }
                uiState.error != null && cart == null -> {
                    ErrorState(
                        message = uiState.error ?: "Failed to load cart",
                        onRetry = { viewModel.loadCart() }
                    )
                }
                cart == null || cart.items.isEmpty() -> {
                    EmptyCartState(onNavigateBack = onNavigateBack)
                }
                else -> {
                    CartContent(
                        cart = cart,
                        promoCode = uiState.promoCode,
                        promoError = uiState.promoError,
                        isApplyingPromo = uiState.isApplyingPromo,
                        updatingItemId = uiState.updatingItemId,
                        removingItemId = uiState.removingItemId,
                        onUpdateQuantity = viewModel::updateQuantity,
                        onRemoveItem = viewModel::removeItem,
                        onPromoCodeChange = viewModel::updatePromoCode,
                        onApplyPromo = viewModel::applyPromoCode,
                        onRemovePromo = viewModel::removePromoCode,
                        onNavigateToProduct = onNavigateToProduct
                    )
                }
            }
            
            // Pull-to-refresh indicator
            PullToRefreshContainer(
                state = pullToRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
    }
}

/**
 * Cart Content
 * Main scrollable content with cart items and pricing
 */
@Composable
private fun CartContent(
    cart: com.shambit.customer.data.remote.dto.response.CartDto,
    promoCode: String,
    promoError: String?,
    isApplyingPromo: Boolean,
    updatingItemId: String?,
    removingItemId: String?,
    onUpdateQuantity: (String, Int) -> Unit,
    onRemoveItem: (String) -> Unit,
    onPromoCodeChange: (String) -> Unit,
    onApplyPromo: () -> Unit,
    onRemovePromo: () -> Unit,
    onNavigateToProduct: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Cart items
        items(
            items = cart.items,
            key = { it.id }
        ) { item ->
            CartItemCard(
                item = item,
                isUpdating = updatingItemId == item.id,
                isRemoving = removingItemId == item.id,
                onUpdateQuantity = { newQuantity ->
                    onUpdateQuantity(item.id, newQuantity)
                },
                onRemove = { onRemoveItem(item.id) },
                onClick = { onNavigateToProduct(item.productId) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
        }
        
        // Promo code section
        item {
            PromoCodeSection(
                promoCode = promoCode,
                promoError = promoError,
                isApplying = isApplyingPromo,
                appliedPromo = cart.promoCode,
                onPromoCodeChange = onPromoCodeChange,
                onApply = onApplyPromo,
                onRemove = onRemovePromo,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
        }
        
        // Price breakdown
        item {
            PriceBreakdown(
                cart = cart,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
        }
        
        // Bottom spacing for checkout bar
        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

/**
 * Cart Item Card
 * Individual cart item with product info and quantity controls
 */
@Composable
private fun CartItemCard(
    item: CartItemDto,
    isUpdating: Boolean,
    isRemoving: Boolean,
    onUpdateQuantity: (Int) -> Unit,
    onRemove: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val alpha by animateFloatAsState(
        targetValue = if (isRemoving) 0.5f else 1f,
        label = "item_alpha"
    )
    
    Card(
        modifier = modifier.alpha(alpha),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Product image
            AsyncImage(
                model = ImageUrlHelper.getAbsoluteUrl(item.product.imageUrls.firstOrNull()),
                contentDescription = item.product.name,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentScale = ContentScale.Crop
            )
            
            // Product info and controls
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Product name
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                // Price
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "₹${item.product.price}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    
                    // Show price change if different from added price
                    if (item.addedPrice != item.product.price) {
                        Text(
                            text = "₹${item.addedPrice}",
                            style = MaterialTheme.typography.bodySmall,
                            textDecoration = TextDecoration.LineThrough,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Quantity controls and remove button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Quantity selector
                    QuantitySelector(
                        quantity = item.quantity,
                        onQuantityChange = onUpdateQuantity,
                        isUpdating = isUpdating,
                        modifier = Modifier.weight(1f)
                    )
                    
                    // Remove button
                    IconButton(
                        onClick = onRemove,
                        enabled = !isRemoving,
                        modifier = Modifier.size(36.dp)
                    ) {
                        if (isRemoving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Remove",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
                
                // Stock warning
                if (!item.product.isActive) {
                    Text(
                        text = "Product unavailable",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                } else if (item.product.stock != null && item.product.stock < item.quantity) {
                    Text(
                        text = "Only ${item.product.stock} left in stock",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

/**
 * Quantity Selector
 * +/- buttons with quantity display
 */
@Composable
private fun QuantitySelector(
    quantity: Int,
    onQuantityChange: (Int) -> Unit,
    isUpdating: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Decrease button
        IconButton(
            onClick = { onQuantityChange(quantity - 1) },
            enabled = !isUpdating && quantity > 1,
            modifier = Modifier
                .size(32.dp)
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline,
                    shape = CircleShape
                )
        ) {
            Text(
                text = "-",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (quantity > 1) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        // Quantity display
        Box(
            modifier = Modifier
                .width(40.dp)
                .height(32.dp)
                .background(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isUpdating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Text(
                    text = quantity.toString(),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
        
        // Increase button
        IconButton(
            onClick = { onQuantityChange(quantity + 1) },
            enabled = !isUpdating,
            modifier = Modifier
                .size(32.dp)
                .background(
                    color = MaterialTheme.colorScheme.primary,
                    shape = CircleShape
                )
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Increase",
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onPrimary
            )
        }
    }
}

/**
 * Promo Code Section
 * Input field for promo code with apply/remove functionality
 */
@Composable
private fun PromoCodeSection(
    promoCode: String,
    promoError: String?,
    isApplying: Boolean,
    appliedPromo: String?,
    onPromoCodeChange: (String) -> Unit,
    onApply: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Have a promo code?",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            if (appliedPromo != null) {
                // Show applied promo code
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = appliedPromo,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "Promo code applied",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    
                    IconButton(onClick = onRemove) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Remove promo",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            } else {
                // Show promo code input
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    OutlinedTextField(
                        value = promoCode,
                        onValueChange = onPromoCodeChange,
                        modifier = Modifier.weight(1f),
                        placeholder = {
                            Text(
                                text = "Enter code",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        },
                        singleLine = true,
                        isError = promoError != null,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                    
                    Button(
                        onClick = onApply,
                        enabled = !isApplying && promoCode.isNotBlank(),
                        modifier = Modifier.height(56.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        if (isApplying) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Apply")
                        }
                    }
                }
                
                // Show error
                if (promoError != null) {
                    Text(
                        text = promoError,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

/**
 * Price Breakdown
 * Shows subtotal, discounts, taxes, delivery fee, and total
 */
@Composable
private fun PriceBreakdown(
    cart: com.shambit.customer.data.remote.dto.response.CartDto,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Price Details",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            
            // Subtotal
            PriceRow(
                label = "Subtotal (${cart.itemCount} items)",
                amount = cart.subtotal
            )
            
            // Discount
            if (cart.discountAmount > 0) {
                PriceRow(
                    label = "Discount",
                    amount = -cart.discountAmount,
                    isDiscount = true
                )
            }
            
            // Tax
            if (cart.taxAmount > 0) {
                PriceRow(
                    label = "Tax",
                    amount = cart.taxAmount
                )
            }
            
            // Delivery fee
            if (cart.deliveryFee > 0) {
                PriceRow(
                    label = "Delivery Fee",
                    amount = cart.deliveryFee
                )
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Delivery Fee",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "FREE",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            
            // Total
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Total Amount",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "₹${String.format("%.2f", cart.totalAmount)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            // Savings message
            if (cart.discountAmount > 0) {
                Text(
                    text = "You saved ₹${String.format("%.2f", cart.discountAmount)} on this order!",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(6.dp)
                        )
                        .padding(8.dp)
                )
            }
        }
    }
}

/**
 * Price Row
 * Single row in price breakdown
 */
@Composable
private fun PriceRow(
    label: String,
    amount: Double,
    isDiscount: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = if (isDiscount) {
                "-₹${String.format("%.2f", -amount)}"
            } else {
                "₹${String.format("%.2f", amount)}"
            },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = if (isDiscount) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurface
        )
    }
}

/**
 * Checkout Bar
 * Bottom bar with total and checkout button
 */
@Composable
private fun CheckoutBar(
    totalAmount: Double,
    itemCount: Int,
    onCheckout: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Total amount
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = "₹${String.format("%.2f", totalAmount)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "$itemCount items",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            // Checkout button
            Button(
                onClick = onCheckout,
                modifier = Modifier.height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text(
                    text = "Proceed to Checkout",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

/**
 * Empty Cart State
 * Shown when cart has no items
 */
@Composable
private fun EmptyCartState(
    onNavigateBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Empty cart icon
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                modifier = Modifier.size(60.dp),
                tint = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Empty message
        Text(
            text = "Your cart is empty",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Add items to your cart to see them here",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Continue shopping button
        Button(
            onClick = onNavigateBack,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = "Continue Shopping",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
