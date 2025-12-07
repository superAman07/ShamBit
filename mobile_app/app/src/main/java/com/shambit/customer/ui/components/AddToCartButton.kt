package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shambit.customer.util.HapticFeedbackManager
import kotlinx.coroutines.delay

/**
 * AddToCartButton Component
 * 
 * Features:
 * - Initial state: "Add to Cart" button with cart icon
 * - After first add: Quantity selector (-, count, +)
 * - Loading indicator during cart operations
 * - Success animation (scale + checkmark) on successful add
 * - Haptic feedback on quantity change
 * - Disabled state when out of stock
 */
@Composable
fun AddToCartButton(
    quantity: Int,
    isLoading: Boolean,
    isOutOfStock: Boolean,
    onAddToCart: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    var showSuccess by remember { mutableStateOf(false) }
    var previousQuantity by remember { mutableStateOf(quantity) }
    
    // Success animation trigger - only when quantity actually changes
    LaunchedEffect(quantity) {
        if (quantity > 0 && quantity != previousQuantity && !isLoading) {
            showSuccess = true
            delay(500)
            showSuccess = false
        }
        previousQuantity = quantity
    }
    
    // Scale animation for success
    val scale by animateFloatAsState(
        targetValue = if (showSuccess) 1.2f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "success_scale"
    )
    
    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    ) {
        if (quantity == 0) {
            // Initial "Add to Cart" button
            AddButton(
                isLoading = isLoading,
                isOutOfStock = isOutOfStock,
                onClick = {
                    hapticFeedback?.performMediumImpact()
                    onAddToCart()
                }
            )
        } else {
            // Quantity selector
            QuantitySelector(
                quantity = quantity,
                isLoading = isLoading,
                onIncrement = {
                    hapticFeedback?.performLightImpact()
                    onIncrement()
                },
                onDecrement = {
                    hapticFeedback?.performLightImpact()
                    onDecrement()
                }
            )
        }
        
        // Success checkmark overlay
        AnimatedVisibility(
            visible = showSuccess,
            enter = scaleIn() + fadeIn(),
            exit = scaleOut() + fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.9f),
                        RoundedCornerShape(8.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Added to cart",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * Initial Add Button
 */
@Composable
private fun AddButton(
    isLoading: Boolean,
    isOutOfStock: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (isOutOfStock) {
                    MaterialTheme.colorScheme.surfaceVariant
                } else {
                    MaterialTheme.colorScheme.primary
                }
            )
            .clickable(enabled = !isLoading && !isOutOfStock) { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary
            )
        } else {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.ShoppingCart,
                    contentDescription = null,
                    tint = if (isOutOfStock) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onPrimary
                    },
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = if (isOutOfStock) "Out of Stock" else "Add",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (isOutOfStock) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onPrimary
                    },
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

/**
 * Quantity Selector
 */
@Composable
private fun QuantitySelector(
    quantity: Int,
    isLoading: Boolean,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.primaryContainer)
            .padding(horizontal = 4.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Decrement button
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.primary)
                .clickable(enabled = !isLoading && quantity > 0) { onDecrement() },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "-",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.Bold
            )
        }
        
        // Quantity display
        Box(
            modifier = Modifier.size(width = 32.dp, height = 28.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            } else {
                Text(
                    text = quantity.toString(),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        
        // Increment button
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.primary)
                .clickable(enabled = !isLoading) { onIncrement() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Increase quantity",
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}
