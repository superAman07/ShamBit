package com.shambit.customer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.util.HapticFeedbackManager

/**
 * ProductGrid Component
 * Reusable vertical grid layout for displaying products
 * 
 * Features:
 * - LazyVerticalGrid with adaptive columns (min 160.dp)
 * - Handles loading, empty, and success states
 * - Uses ProductCard for items
 * - Uses ProductGridSkeleton for loading
 * - Uses DefaultEmptyState for empty
 * - Supports wishlist and cart operations
 * 
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */
@Composable
fun ProductGrid(
    products: List<ProductDto>,
    wishlistProductIds: Set<String>,
    cartQuantities: Map<String, Int>,
    onProductClick: (ProductDto) -> Unit,
    onWishlistToggle: (ProductDto) -> Unit,
    onAddToCart: (ProductDto) -> Unit,
    onIncrementCart: (ProductDto) -> Unit,
    onDecrementCart: (ProductDto) -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    emptyState: @Composable () -> Unit = { DefaultEmptyState() },
    hapticFeedback: HapticFeedbackManager? = null
) {
    when {
        isLoading -> {
            ProductGridSkeleton(modifier = modifier)
        }
        products.isEmpty() -> {
            emptyState()
        }
        else -> {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = products,
                    key = { product -> product.id }
                ) { product ->
                    ProductCard(
                        product = product,
                        cartQuantity = cartQuantities[product.id] ?: 0,
                        isInWishlist = wishlistProductIds.contains(product.id),
                        onClick = { onProductClick(product) },
                        onAddToCart = { onAddToCart(product) },
                        onIncrementCart = { onIncrementCart(product) },
                        onDecrementCart = { onDecrementCart(product) },
                        onToggleWishlist = { onWishlistToggle(product) },
                        hapticFeedback = hapticFeedback
                    )
                }
            }
        }
    }
}

/**
 * ProductGridSkeleton Component
 * Skeleton loader for product grid
 * 
 * Requirements: 8.3
 */
@Composable
fun ProductGridSkeleton(
    modifier: Modifier = Modifier,
    itemCount: Int = 6
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 160.dp),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(itemCount) {
            ProductCardSkeleton()
        }
    }
}

/**
 * DefaultEmptyState Component
 * Professional empty state with illustration and helpful message
 * 
 * Requirements: 8.4
 */
@Composable
fun DefaultEmptyState(
    title: String = "No products found",
    message: String = "Try adjusting your filters or check back later",
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.ShoppingCart,
            contentDescription = null,
            modifier = Modifier.size(120.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}
