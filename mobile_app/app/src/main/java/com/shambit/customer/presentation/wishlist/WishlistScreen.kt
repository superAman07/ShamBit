package com.shambit.customer.presentation.wishlist

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.local.database.WishlistEntity
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.util.ImageUrlHelper

/**
 * Wishlist Screen
 * Displays user's wishlist items with options to add to cart or remove
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(
    viewModel: WishlistViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToProduct: (String) -> Unit = {},
    onNavigateToHome: () -> Unit = {},
    onNavigateToSearch: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showClearDialog by remember { mutableStateOf(false) }
    val hapticFeedback = com.shambit.customer.util.rememberHapticFeedback()
    
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
                        text = "My Wishlist",
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
                actions = {
                    if (uiState.wishlistItems.isNotEmpty()) {
                        TextButton(onClick = { showClearDialog = true }) {
                            Text(
                                text = "Clear All",
                                color = MaterialTheme.colorScheme.error
                            )
                        }
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
            com.shambit.customer.ui.components.BottomNavigationBar(
                selectedRoute = com.shambit.customer.ui.components.NavigationRoutes.WISHLIST,
                scrollOffset = 0f,
                scrollDirection = com.shambit.customer.ui.components.ScrollDirection.None,
                onNavigate = { route ->
                    when (route) {
                        com.shambit.customer.ui.components.NavigationRoutes.HOME -> onNavigateToHome()
                        com.shambit.customer.ui.components.NavigationRoutes.SEARCH -> onNavigateToSearch()
                        com.shambit.customer.ui.components.NavigationRoutes.WISHLIST -> {
                            // Already on wishlist
                        }
                        com.shambit.customer.ui.components.NavigationRoutes.PROFILE -> onNavigateToProfile()
                    }
                },
                hapticFeedback = hapticFeedback
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.wishlistItems.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.wishlistItems.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: "Failed to load wishlist",
                        onRetry = { /* Reload handled by Flow */ }
                    )
                }
                uiState.wishlistItems.isEmpty() -> {
                    EmptyWishlistState(onNavigateToHome = onNavigateToHome)
                }
                else -> {
                    WishlistContent(
                        items = uiState.wishlistItems,
                        removingItemId = uiState.removingItemId,
                        addingToCartId = uiState.addingToCartId,
                        onRemoveItem = viewModel::removeFromWishlist,
                        onAddToCart = viewModel::addToCart,
                        onNavigateToProduct = onNavigateToProduct
                    )
                }
            }
        }
    }
    
    // Clear wishlist confirmation dialog
    if (showClearDialog) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = {
                Text(
                    text = "Clear Wishlist",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to remove all items from your wishlist?",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.clearWishlist()
                        showClearDialog = false
                    }
                ) {
                    Text(
                        text = "Clear",
                        color = MaterialTheme.colorScheme.error
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * Wishlist Content
 * Main scrollable content with wishlist items
 */
@Composable
private fun WishlistContent(
    items: List<WishlistEntity>,
    removingItemId: String?,
    addingToCartId: String?,
    onRemoveItem: (String) -> Unit,
    onAddToCart: (String, Int) -> Unit,
    onNavigateToProduct: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)
    ) {
        // Wishlist count header
        item {
            Text(
                text = "${items.size} ${if (items.size == 1) "item" else "items"} in your wishlist",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        
        // Wishlist items
        items(
            items = items,
            key = { it.productId }
        ) { item ->
            WishlistItemCard(
                item = item,
                isRemoving = removingItemId == item.productId,
                isAddingToCart = addingToCartId == item.productId,
                onRemove = { onRemoveItem(item.productId) },
                onAddToCart = { onAddToCart(item.productId, 1) },
                onClick = { onNavigateToProduct(item.productId) }
            )
        }
    }
}

/**
 * Wishlist Item Card
 * Individual wishlist item with product info and action buttons
 */
@Composable
private fun WishlistItemCard(
    item: WishlistEntity,
    isRemoving: Boolean,
    isAddingToCart: Boolean,
    onRemove: () -> Unit,
    onAddToCart: () -> Unit,
    onClick: () -> Unit
) {
    val alpha by animateFloatAsState(
        targetValue = if (isRemoving) 0.5f else 1f,
        label = "item_alpha"
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(alpha),
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
                model = ImageUrlHelper.getAbsoluteUrl(item.imageUrl),
                contentDescription = item.name,
                modifier = Modifier
                    .size(100.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentScale = ContentScale.Crop
            )
            
            // Product info and actions
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Product name
                Text(
                    text = item.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                // Brand
                if (item.brand != null) {
                    Text(
                        text = item.brand,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                // Price
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "₹${String.format("%.2f", item.price)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    
                    // MRP if different
                    if (item.mrp != null && item.mrp > item.price) {
                        Text(
                            text = "₹${String.format("%.2f", item.mrp)}",
                            style = MaterialTheme.typography.bodySmall,
                            textDecoration = TextDecoration.LineThrough,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        
                        // Discount percentage
                        val discount = ((item.mrp - item.price) / item.mrp * 100).toInt()
                        Text(
                            text = "$discount% OFF",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .background(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = RoundedCornerShape(4.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Add to Cart button
                    Button(
                        onClick = onAddToCart,
                        enabled = !isAddingToCart && !isRemoving && item.isAvailable,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        if (isAddingToCart) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.ShoppingCart,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (item.isAvailable) "Add to Cart" else "Out of Stock",
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                    
                    // Remove button
                    IconButton(
                        onClick = onRemove,
                        enabled = !isRemoving,
                        modifier = Modifier.size(40.dp)
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
                
                // Availability warning
                if (!item.isAvailable) {
                    Text(
                        text = "Currently unavailable",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier
                            .background(
                                color = MaterialTheme.colorScheme.errorContainer,
                                shape = RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                } else if (item.stock != null && item.stock < 5) {
                    Text(
                        text = "Only ${item.stock} left in stock",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

/**
 * Empty Wishlist State
 * Shown when wishlist is empty
 */
@Composable
private fun EmptyWishlistState(
    onNavigateToHome: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Heart icon
        Icon(
            imageVector = Icons.Default.Favorite,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Title
        Text(
            text = "Your Wishlist is Empty",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Description
        Text(
            text = "Save your favorite items here to buy them later",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Browse button
        Button(
            onClick = onNavigateToHome,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(0.6f)
        ) {
            Text(
                text = "Start Shopping",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(vertical = 4.dp)
            )
        }
    }
}
