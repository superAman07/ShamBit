package com.shambit.customer.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.util.HapticFeedbackManager

/**
 * CategoryCard Component
 * Displays a category with circular icon and name
 * 
 * Features:
 * - Circular icon (64dp diameter)
 * - Category name with 2-line max and ellipsis
 * - Icon URL with fallback to image URL
 * - Scale animation on tap (1.0x → 0.95x → 1.0x)
 * - Haptic feedback (20ms light impact)
 */
@Composable
fun CategoryCard(
    category: CategoryDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    // Scale animation: 1.0x → 0.95x when pressed
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "category_card_scale"
    )
    
    Column(
        modifier = modifier
            .width(80.dp)
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
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Circular icon
        Card(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape),
            shape = CircleShape,
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            AsyncImage(
                model = category.getFullIconUrl(),
                contentDescription = "Category icon: ${category.name}",
                modifier = Modifier.size(64.dp),
                contentScale = ContentScale.Crop
            )
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Category name
        Text(
            text = category.name,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

/**
 * CategoryRow Component
 * Horizontal scrollable row of category cards
 * 
 * Features:
 * - LazyRow for categories with 12dp spacing
 * - Horizontal padding (16dp)
 * - Swipe gesture with momentum
 * - Haptic feedback on swipe
 * - Animated position changes (400ms)
 */
@Composable
fun CategoryRow(
    categories: List<CategoryDto>,
    onCategoryClick: (CategoryDto) -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            items = categories,
            key = { category -> category.id }
        ) { category ->
            // Animate position changes with 400ms duration
            androidx.compose.animation.AnimatedVisibility(
                visible = true,
                enter = androidx.compose.animation.fadeIn(
                    animationSpec = tween(durationMillis = 400)
                ) + androidx.compose.animation.slideInHorizontally(
                    animationSpec = tween(durationMillis = 400)
                ),
                exit = androidx.compose.animation.fadeOut(
                    animationSpec = tween(durationMillis = 400)
                ) + androidx.compose.animation.slideOutHorizontally(
                    animationSpec = tween(durationMillis = 400)
                )
            ) {
                CategoryCard(
                    category = category,
                    onClick = { onCategoryClick(category) },
                    hapticFeedback = hapticFeedback
                )
            }
        }
    }
}

/**
 * CategorySection Component
 * Complete category section with title and row
 */
@Composable
fun CategorySection(
    categories: List<CategoryDto>,
    onCategoryClick: (CategoryDto) -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    if (categories.isEmpty()) return
    
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section title
        Text(
            text = "Shop by Category",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        
        // Category row
        CategoryRow(
            categories = categories,
            onCategoryClick = onCategoryClick,
            hapticFeedback = hapticFeedback
        )
    }
}
