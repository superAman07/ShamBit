package com.shambit.customer.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.util.HapticFeedbackManager

/**
 * PriceDisplay Composable
 * Displays product price with discount badge
 * 
 * Features:
 * - Selling price in primary color (bold)
 * - MRP with strikethrough if discount exists
 * - Discount percentage badge with error color
 * - Rupee symbol formatting
 */
@Composable
fun PriceDisplay(
    product: ProductDto,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        // Price row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Selling price (primary color, bold)
            Text(
                text = "₹${product.sellingPrice.toInt()}",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            // MRP with strikethrough (if discount exists)
            if (product.hasDiscount()) {
                Text(
                    text = "₹${product.mrp.toInt()}",
                    style = MaterialTheme.typography.bodySmall,
                    textDecoration = TextDecoration.LineThrough,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        
        // Discount badge (if discount exists)
        if (product.hasDiscount()) {
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "${product.getDiscountPercentage()}% OFF",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .background(
                        MaterialTheme.colorScheme.errorContainer,
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    }
}

/**
 * ProductCard Component (Enhanced)
 * Displays product with all modern e-commerce features
 * 
 * Features:
 * - Product image with badges and stock indicator
 * - Product name, unit info, rating
 * - Price display with discount
 * - Add to cart button with quantity selector
 * - Wishlist toggle button
 * - Delivery time indicator
 * - Tap handler for product detail navigation
 * - Subtle zoom animation on tap
 */
@Composable
fun ProductCard(
    product: ProductDto,
    cartQuantity: Int = 0,
    isInWishlist: Boolean = false,
    isCartLoading: Boolean = false,
    isWishlistLoading: Boolean = false,
    onClick: () -> Unit,
    onAddToCart: () -> Unit = {},
    onIncrementCart: () -> Unit = {},
    onDecrementCart: () -> Unit = {},
    onToggleWishlist: () -> Unit = {},
    onRatingClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    // Subtle zoom animation: 1.0x → 1.05x when pressed
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 1.05f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "product_card_scale"
    )
    
    // Elevation animation
    val elevation by animateFloatAsState(
        targetValue = if (isPressed) 4f else 2f,
        animationSpec = tween(durationMillis = 100),
        label = "product_card_elevation"
    )
    
    Card(
        modifier = modifier
            .width(180.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) {
                hapticFeedback?.performLightImpact()
                onClick()
            },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            // Product image with overlays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                // Product image
                AsyncImage(
                    model = product.getFirstImageUrl(),
                    contentDescription = "Product image: ${product.name}",
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop
                )
                
                // Product badges (top-left)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                ) {
                    ProductBadges(badges = parseBadges(product.badges))
                }
                
                // Stock badge (top-right)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                ) {
                    StockBadge(stockQuantity = product.stockQuantity)
                }
                
                // Wishlist button (top-right, below stock badge)
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 32.dp, end = 2.dp)
                ) {
                    WishlistIconButton(
                        isInWishlist = isInWishlist,
                        isLoading = isWishlistLoading,
                        onToggle = onToggleWishlist,
                        hapticFeedback = hapticFeedback
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Product name (2 lines max)
            Text(
                text = product.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Unit info
            UnitInfo(
                unitSize = product.unitSize,
                unitType = product.unitType
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Rating
            CompactRatingStars(
                rating = product.averageRating,
                reviewCount = product.reviewCount,
                onRatingClick = onRatingClick
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Price display
            PriceDisplay(product = product)
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Delivery info
            DeliveryInfo(deliveryTime = product.deliveryTime)
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Add to cart button
            AddToCartButton(
                quantity = cartQuantity,
                isLoading = isCartLoading,
                isOutOfStock = product.isOutOfStock(),
                onAddToCart = onAddToCart,
                onIncrement = onIncrementCart,
                onDecrement = onDecrementCart,
                modifier = Modifier.fillMaxWidth(),
                hapticFeedback = hapticFeedback
            )
        }
    }
}

/**
 * ProductRow Component
 * Horizontal scrollable row of product cards
 * 
 * Features:
 * - LazyRow for products with 12dp spacing
 * - Horizontal padding (16dp)
 * - Load product images using Coil
 * - Lazy loading as items enter viewport
 */
@Composable
fun ProductRow(
    products: List<ProductDto>,
    onProductClick: (ProductDto) -> Unit,
    getCartQuantity: (String) -> Int = { 0 },
    isInWishlist: (String) -> Boolean = { false },
    onAddToCart: (ProductDto) -> Unit = {},
    onIncrementCart: (ProductDto) -> Unit = {},
    onDecrementCart: (ProductDto) -> Unit = {},
    onToggleWishlist: (ProductDto) -> Unit = {},
    onRatingClick: ((ProductDto) -> Unit)? = null,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    var cartLoadingProductId by remember { mutableStateOf<String?>(null) }
    var wishlistLoadingProductId by remember { mutableStateOf<String?>(null) }
    
    // Clear loading state when cart quantity changes
    LaunchedEffect(products.map { getCartQuantity(it.id) }) {
        cartLoadingProductId = null
    }
    
    // Auto-clear loading state after timeout (2 seconds) to prevent infinite loading
    LaunchedEffect(cartLoadingProductId) {
        cartLoadingProductId?.let {
            kotlinx.coroutines.delay(2000)
            cartLoadingProductId = null
        }
    }
    
    LaunchedEffect(wishlistLoadingProductId) {
        wishlistLoadingProductId?.let {
            kotlinx.coroutines.delay(2000)
            wishlistLoadingProductId = null
        }
    }
    
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            items = products,
            key = { product -> product.id }
        ) { product ->
            val currentQuantity = getCartQuantity(product.id)
            
            ProductCard(
                product = product,
                cartQuantity = currentQuantity,
                isInWishlist = isInWishlist(product.id),
                isCartLoading = cartLoadingProductId == product.id,
                isWishlistLoading = wishlistLoadingProductId == product.id,
                onClick = { onProductClick(product) },
                onAddToCart = {
                    cartLoadingProductId = product.id
                    onAddToCart(product)
                },
                onIncrementCart = {
                    cartLoadingProductId = product.id
                    onIncrementCart(product)
                },
                onDecrementCart = {
                    cartLoadingProductId = product.id
                    onDecrementCart(product)
                },
                onToggleWishlist = {
                    wishlistLoadingProductId = product.id
                    onToggleWishlist(product)
                },
                onRatingClick = if (onRatingClick != null) {
                    { onRatingClick(product) }
                } else null,
                hapticFeedback = hapticFeedback
            )
        }
    }
}

/**
 * FeaturedProductsSection Component
 * Complete featured products section with title and row
 */
@Composable
fun FeaturedProductsSection(
    products: List<ProductDto>,
    onProductClick: (ProductDto) -> Unit,
    getCartQuantity: (String) -> Int = { 0 },
    isInWishlist: (String) -> Boolean = { false },
    onAddToCart: (ProductDto) -> Unit = {},
    onIncrementCart: (ProductDto) -> Unit = {},
    onDecrementCart: (ProductDto) -> Unit = {},
    onToggleWishlist: (ProductDto) -> Unit = {},
    onRatingClick: ((ProductDto) -> Unit)? = null,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    if (products.isEmpty()) return
    
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section title
        Text(
            text = "Featured Products",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        
        // Product row
        ProductRow(
            products = products,
            onProductClick = onProductClick,
            getCartQuantity = getCartQuantity,
            isInWishlist = isInWishlist,
            onAddToCart = onAddToCart,
            onIncrementCart = onIncrementCart,
            onDecrementCart = onDecrementCart,
            onToggleWishlist = onToggleWishlist,
            onRatingClick = onRatingClick,
            hapticFeedback = hapticFeedback
        )
    }
}
