package com.shambit.customer.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import com.shambit.customer.util.HapticFeedbackManager
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.ui.draw.alpha

// Shimmer function moved to SkeletonLoader.kt to avoid conflicts

/**
 * SubcategoryChip Component
 * Individual chip for subcategory selection with enhanced animations
 * 
 * Features:
 * - Enhanced scale animation on tap (1.0x → 1.08x when pressed, 1.02x when selected)
 * - Smooth elevation animation (2dp → 8dp when pressed, 4dp when selected)
 * - Smooth color transitions for active/inactive states (300ms duration)
 * - Haptic feedback timing integrated with visual animations
 * - Spring-based animations for natural feel
 * - Rounded corners (20dp for pill shape)
 */
@Composable
fun SubcategoryChip(
    subcategory: SubcategoryDto,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    // Enhanced scale animation: 1.0x → 1.08x when pressed, 1.02x when selected
    val scale by animateFloatAsState(
        targetValue = when {
            isPressed -> 1.08f
            isSelected -> 1.02f
            else -> 1.0f
        },
        animationSpec = spring(
            dampingRatio = 0.6f,
            stiffness = 400f
        ),
        label = "subcategory_chip_scale"
    )
    
    // Enhanced elevation animation: 2dp → 8dp when pressed, 4dp when selected
    val elevation by animateFloatAsState(
        targetValue = when {
            isPressed -> 8f
            isSelected -> 4f
            else -> 2f
        },
        animationSpec = spring(
            dampingRatio = 0.7f,
            stiffness = 300f
        ),
        label = "subcategory_chip_elevation"
    )
    
    // Smooth color transitions for container
    val containerColor by animateColorAsState(
        targetValue = if (isSelected) {
            MaterialTheme.colorScheme.primaryContainer
        } else {
            MaterialTheme.colorScheme.surface
        },
        animationSpec = tween(durationMillis = 300),
        label = "subcategory_chip_container_color"
    )
    
    // Smooth color transitions for text
    val textColor by animateColorAsState(
        targetValue = if (isSelected) {
            MaterialTheme.colorScheme.onPrimaryContainer
        } else {
            MaterialTheme.colorScheme.onSurface
        },
        animationSpec = tween(durationMillis = 300),
        label = "subcategory_chip_text_color"
    )
    
    Card(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) {
                // Haptic feedback timing integrated with visual animations
                // Trigger haptic slightly before visual feedback completes for natural feel
                hapticFeedback?.performLightImpact()
                onClick()
            }
            .semantics {
                // Accessibility: Descriptive labels for screen readers
                contentDescription = buildString {
                    append("Subcategory ${subcategory.name}")
                    if (isSelected) {
                        append(", selected")
                    } else {
                        append(", not selected")
                    }
                    append(". Tap to ${if (isSelected) "deselect" else "select"}")
                }
                role = Role.Tab
            },
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation.dp),
        colors = CardDefaults.cardColors(
            containerColor = containerColor
        )
    ) {
        Text(
            text = subcategory.name,
            style = MaterialTheme.typography.bodyMedium,
            color = textColor,
            fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp) // Increased vertical padding for 48dp minimum touch target
        )
    }
}

/**
 * SubcategoryChipSkeleton Component
 * Skeleton loader for subcategory chips
 */
@Composable
fun SubcategoryChipSkeleton(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .width(80.dp)
            .height(36.dp)
            .clip(RoundedCornerShape(20.dp))
            .shimmer()
    )
}

/**
 * SubcategoryChipsRow Component
 * Horizontal scrollable row of subcategory chips
 * 
 * Features:
 * - LazyRow with 8dp spacing between chips
 * - Horizontal padding (16dp)
 * - Smooth scrolling with momentum
 * - Haptic feedback integration
 */
@Composable
fun SubcategoryChipsRow(
    subcategories: List<SubcategoryDto>,
    selectedSubcategoryId: String?,
    onSubcategorySelected: (SubcategoryDto) -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = subcategories,
            key = { subcategory -> subcategory.id }
        ) { subcategory ->
            SubcategoryChip(
                subcategory = subcategory,
                isSelected = subcategory.id == selectedSubcategoryId,
                onClick = { onSubcategorySelected(subcategory) },
                hapticFeedback = hapticFeedback
            )
        }
    }
}

/**
 * SubcategoryChipsRowSkeleton Component
 * Skeleton loader for subcategory chips row
 */
@Composable
fun SubcategoryChipsRowSkeleton(
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(6) {
            SubcategoryChipSkeleton()
        }
    }
}

/**
 * SubcategoryChipsSection Component
 * Complete subcategory chips section with title and chips row
 * 
 * Features:
 * - Section title with consistent styling
 * - Skeleton loading states using existing shimmer patterns
 * - Empty state handling
 * - Haptic feedback integration
 * - Extends existing scroll animation patterns
 */
@Composable
fun SubcategoryChipsSection(
    subcategories: List<SubcategoryDto>,
    selectedSubcategoryId: String?,
    onSubcategorySelected: (SubcategoryDto) -> Unit,
    isLoading: Boolean = false,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section title
        Text(
            text = "Browse by Subcategory",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        
        // Chips row or skeleton
        if (isLoading) {
            SubcategoryChipsRowSkeleton()
        } else if (subcategories.isNotEmpty()) {
            SubcategoryChipsRow(
                subcategories = subcategories,
                selectedSubcategoryId = selectedSubcategoryId,
                onSubcategorySelected = onSubcategorySelected,
                hapticFeedback = hapticFeedback
            )
        }
        // Note: Empty state is handled by not showing the section at all
    }
}

/**
 * SubcategoryChipsSkeleton Component
 * Complete skeleton loader for subcategory chips section
 * 
 * Features:
 * - Section title skeleton
 * - Horizontal row of chip skeletons
 * - Consistent with existing shimmer patterns
 */
@Composable
fun SubcategoryChipsSkeleton(
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Section title skeleton
        Box(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .width(180.dp)
                .height(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .shimmer()
        )
        
        // Chips row skeleton
        SubcategoryChipsRowSkeleton()
    }
}