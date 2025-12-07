package com.shambit.customer.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.util.HapticFeedbackManager

/**
 * CompactProductCard
 * Smaller card for grid layouts with less information
 * 
 * Use case: Grid view, search results, category listings
 * Size: 140dp width
 * Features: Image, name, price, rating, add to cart
 */
@Composable
fun CompactProductCard(
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
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 1.05f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "compact_card_scale"
    )
    
    Card(
        modifier = modifier
            .width(140.dp)
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
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                    .height(120.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                AsyncImage(
                    model = product.getFirstImageUrl(),
                    contentDescription = "Product image: ${product.name}",
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop
                )
                
                // Wishlist button
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                ) {
                    WishlistIconButton(
                        isInWishlist = isInWishlist,
                        isLoading = isWishlistLoading,
                        onToggle = onToggleWishlist,
                        hapticFeedback = hapticFeedback
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(6.dp))
            
            // Product name (2 lines max)
            Text(
                text = product.name,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(32.dp)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Rating (compact)
            CompactRatingStars(
                rating = product.averageRating,
                reviewCount = product.reviewCount
            )
            
            Spacer(modifier = Modifier.height(6.dp))
            
            // Price
            Text(
                text = "₹${product.sellingPrice.toInt()}",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(6.dp))
            
            // Add to cart button (compact)
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
 * DetailedProductCard
 * Horizontal card for list layouts with more information
 * 
 * Use case: List view, cart items, order history
 * Layout: Horizontal (image on left, details on right)
 * Features: All product information visible
 */
@Composable
fun DetailedProductCard(
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
    
    val elevation by animateFloatAsState(
        targetValue = if (isPressed) 4f else 2f,
        animationSpec = tween(durationMillis = 100),
        label = "detailed_card_elevation"
    )
    
    Card(
        modifier = modifier
            .fillMaxWidth()
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
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Product image
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                AsyncImage(
                    model = product.getFirstImageUrl(),
                    contentDescription = "Product image: ${product.name}",
                    modifier = Modifier.matchParentSize(),
                    contentScale = ContentScale.Crop
                )
                
                // Badges
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(4.dp)
                ) {
                    ProductBadges(badges = parseBadges(product.badges))
                }
            }
            
            // Product details
            Column(
                modifier = Modifier
                    .weight(1f)
                    .height(100.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    // Product name
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        fontWeight = FontWeight.SemiBold
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    // Unit info
                    UnitInfo(
                        unitSize = product.unitSize,
                        unitType = product.unitType
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    // Rating
                    RatingStars(
                        rating = product.averageRating,
                        reviewCount = product.reviewCount,
                        onRatingClick = onRatingClick,
                        starSize = 12.dp
                    )
                }
                
                // Price and actions row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Price
                    Column {
                        Text(
                            text = "₹${product.sellingPrice.toInt()}",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                        if (product.hasDiscount()) {
                            Text(
                                text = "${product.getDiscountPercentage()}% OFF",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    
                    // Actions
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        WishlistIconButton(
                            isInWishlist = isInWishlist,
                            isLoading = isWishlistLoading,
                            onToggle = onToggleWishlist,
                            hapticFeedback = hapticFeedback
                        )
                        
                        AddToCartButton(
                            quantity = cartQuantity,
                            isLoading = isCartLoading,
                            isOutOfStock = product.isOutOfStock(),
                            onAddToCart = onAddToCart,
                            onIncrement = onIncrementCart,
                            onDecrement = onDecrementCart,
                            hapticFeedback = hapticFeedback
                        )
                    }
                }
            }
        }
    }
}

/**
 * FeaturedProductCard
 * Larger card for hero sections with prominent display
 * 
 * Use case: Hero sections, featured products, promotions
 * Size: 240dp width
 * Features: Larger image, all information, prominent CTA
 */
@Composable
fun FeaturedProductCard(
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
    
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 1.02f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "featured_card_scale"
    )
    
    Card(
        modifier = modifier
            .width(240.dp)
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
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
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
                    .clip(RoundedCornerShape(12.dp))
            ) {
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
                
                // Wishlist button
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
            
            // Product name (3 lines max for featured)
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                fontWeight = FontWeight.SemiBold
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
                onRatingClick = onRatingClick
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Price display
            PriceDisplay(product = product)
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Delivery info
            DeliveryInfo(deliveryTime = product.deliveryTime)
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Add to cart button (prominent)
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
