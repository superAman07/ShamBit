package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.size.Size
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.util.HapticFeedbackManager
import kotlinx.coroutines.delay
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.ui.draw.alpha

// Shimmer function moved to SkeletonLoader.kt to avoid conflicts

/**
 * ReturnabilityBadge Component
 * Shows returnability status with appropriate styling
 */
@Composable
fun ReturnabilityBadge(
    isReturnable: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            modifier = Modifier.size(12.dp),
            tint = if (isReturnable) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
        Text(
            text = if (isReturnable) "Free returns" else "No returns",
            style = MaterialTheme.typography.labelSmall,
            color = if (isReturnable) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            fontWeight = if (isReturnable) FontWeight.Medium else FontWeight.Normal
        )
    }
}

/**
 * TrustBadges Component
 * Shows trust indicators like secure checkout, COD available, etc.
 */
@Composable
fun TrustBadges(
    showSecureCheckout: Boolean = true,
    showCodAvailable: Boolean = true,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        if (showSecureCheckout) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Secure checkout",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        
        if (showCodAvailable) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.ShoppingCart,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Cash on Delivery available",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * VerticalProductCard Component
 * Premium vertical product card layout with enhanced entry animations
 * 
 * Features:
 * - Larger product image (200dp height)
 * - Product name, unit info, rating
 * - Price display with discount
 * - Returnability status indicator
 * - Delivery estimate with enhanced styling
 * - Trust badges (secure checkout, COD)
 * - Add to cart button with quantity selector
 * - Wishlist toggle button
 * - Enhanced fade-in + slide-up animations for new product appearances
 * - Staggered animation timing for multiple cards (based on index)
 * - Performance-optimized animations that don't impact scroll
 * - Integrates existing cart controls and wishlist functionality
 * - Subtle hover animation on tap
 */
@Composable
fun VerticalProductCard(
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
    onProductImpression: ((String, Int, String) -> Unit)? = null, // NEW: For impression tracking
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null,
    showFadeInAnimation: Boolean = false,
    animationIndex: Int = 0 // NEW: For staggered animation timing
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    var isVisible by remember { mutableStateOf(!showFadeInAnimation) }
    
    // Enhanced fade-in animation for new products with staggered timing
    LaunchedEffect(showFadeInAnimation) {
        if (showFadeInAnimation) {
            // Staggered delay: 0ms, 50ms, 100ms, 150ms, then repeat pattern
            val staggerDelay = (animationIndex % 4) * 50L
            delay(staggerDelay)
            isVisible = true
        }
    }
    
    // Track product impression when card becomes visible
    LaunchedEffect(isVisible, product.id) {
        if (isVisible) {
            onProductImpression?.invoke(product.id, animationIndex, "vertical_feed")
        }
    }
    
    // Subtle zoom animation: 1.0x → 1.02x when pressed (performance optimized)
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 1.02f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "vertical_product_card_scale"
    )
    
    // Elevation animation (performance optimized)
    val elevation by animateFloatAsState(
        targetValue = if (isPressed) 6f else 2f,
        animationSpec = tween(durationMillis = 100),
        label = "vertical_product_card_elevation"
    )
    
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(
            animationSpec = tween(
                durationMillis = 400,
                delayMillis = 0 // Delay handled by LaunchedEffect for better performance
            )
        ) + slideInVertically(
            animationSpec = spring(
                dampingRatio = 0.8f,
                stiffness = 300f
            ),
            initialOffsetY = { it / 3 } // Slightly more pronounced slide-up
        )
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
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
                }
                .semantics {
                    // Accessibility: Comprehensive product description for screen readers
                    contentDescription = buildString {
                        append("Product: ${product.name}")
                        append(", Price: ₹${product.sellingPrice}")
                        if (product.getDiscountPercentage() > 0) {
                            append(", ${product.getDiscountPercentage()}% discount")
                        }
                        append(", Rating: ${product.averageRating ?: 0.0} out of 5 stars")
                        if ((product.reviewCount ?: 0) > 0) {
                            append(", ${product.reviewCount} reviews")
                        }
                        if (product.isReturnable) {
                            append(", Free returns available")
                        }
                        if (product.isOutOfStock()) {
                            append(", Out of stock")
                        } else if (cartQuantity > 0) {
                            append(", $cartQuantity in cart")
                        }
                        append(". Tap to view details")
                    }
                    role = Role.Button
                },
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = elevation.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp)
            ) {
                // Product image with overlays
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(8.dp))
                ) {
                    // Product image with memory-safe loading
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(product.getFirstImageUrl())
                            .memoryCachePolicy(CachePolicy.ENABLED)
                            .diskCachePolicy(CachePolicy.ENABLED)
                            .size(Size(300, 300)) // Limit image size to 300x300dp max
                            .build(),
                        contentDescription = "Product image: ${product.name}",
                        modifier = Modifier.matchParentSize(),
                        contentScale = ContentScale.Crop
                    )
                    
                    // Product badges (top-left)
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                    ) {
                        ProductBadges(badges = parseBadges(product.badges))
                    }
                    
                    // Stock badge (top-right)
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                    ) {
                        StockBadge(stockQuantity = product.stockQuantity)
                    }
                    
                    // Wishlist button (top-right, below stock badge)
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 40.dp, end = 4.dp)
                    ) {
                        WishlistIconButton(
                            isInWishlist = isInWishlist,
                            isLoading = isWishlistLoading,
                            onToggle = onToggleWishlist,
                            hapticFeedback = hapticFeedback
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Product name (2 lines max)
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                )
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Unit info
                UnitInfo(
                    unitSize = product.unitSize,
                    unitType = product.unitType
                )
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Rating
                RatingStars(
                    rating = product.averageRating,
                    reviewCount = product.reviewCount,
                    onRatingClick = onRatingClick,
                    starSize = 14.dp
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Price display
                PriceDisplay(product = product)
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Returnability status
                ReturnabilityBadge(isReturnable = product.isReturnable)
                
                Spacer(modifier = Modifier.height(6.dp))
                
                // Delivery info with enhanced styling
                DeliveryInfo(deliveryTime = product.deliveryTime)
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Trust badges
                TrustBadges()
                
                Spacer(modifier = Modifier.height(12.dp))
                
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
}

/**
 * VerticalProductCardSkeleton Component
 * Skeleton loader for vertical product cards
 */
@Composable
fun VerticalProductCardSkeleton(
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
                .padding(12.dp)
        ) {
            // Product image skeleton
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .shimmer()
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Product name skeleton (2 lines)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(20.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .shimmer()
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Box(
                modifier = Modifier
                    .width(200.dp)
                    .height(20.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .shimmer()
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Unit info skeleton
            Box(
                modifier = Modifier
                    .width(80.dp)
                    .height(16.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .shimmer()
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Rating skeleton
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                repeat(5) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .shimmer()
                    )
                }
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(14.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmer()
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Price skeleton
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .width(80.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmer()
                )
                Box(
                    modifier = Modifier
                        .width(60.dp)
                        .height(20.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmer()
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Additional info skeletons
            repeat(3) {
                Box(
                    modifier = Modifier
                        .width(120.dp)
                        .height(16.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .shimmer()
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Add to cart button skeleton
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .shimmer()
            )
        }
    }
}