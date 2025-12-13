package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.SortOption
import com.shambit.customer.util.HapticFeedbackManager

/**
 * FilterButton Component
 * Individual button for sort or filter actions with enhanced animations
 * 
 * Features:
 * - Enhanced scale animation on tap (1.0x → 0.96x when pressed)
 * - Smooth elevation animation for tactile feedback
 * - Haptic feedback on tap with timing integration
 * - Badge support for filter count with smooth transitions
 * - Consistent styling with existing patterns
 * - Spring-based animations for natural feel
 */
@Composable
fun FilterButton(
    text: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badgeCount: Int = 0,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    // Enhanced scale animation: 1.0x → 0.96x when pressed
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1.0f,
        animationSpec = spring(
            dampingRatio = 0.6f,
            stiffness = 500f
        ),
        label = "filter_button_scale"
    )
    
    // Smooth elevation animation for tactile feedback
    val buttonElevation by animateFloatAsState(
        targetValue = if (isPressed) 1f else 2f,
        animationSpec = spring(
            dampingRatio = 0.7f,
            stiffness = 400f
        ),
        label = "filter_button_elevation"
    )
    
    Box(
        modifier = modifier
    ) {
        Card(
            modifier = Modifier
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .clickable(
                    interactionSource = interactionSource,
                    indication = null
                ) {
                    // Haptic feedback timing integrated with visual animations
                    hapticFeedback?.performLightImpact()
                    onClick()
                },
            shape = RoundedCornerShape(8.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = buttonElevation.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                icon()
                
                Text(
                    text = if (badgeCount > 0) "$text ($badgeCount)" else text,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        
        // Badge indicator for filter count (if > 0)
        if (badgeCount > 0) {
            CircularBadge(
                count = badgeCount,
                modifier = Modifier.align(Alignment.TopEnd)
            )
        }
    }
}

/**
 * StickyFilterBar Component
 * Scroll-aware filter bar with enhanced smooth show/hide animations
 * 
 * Features:
 * - Enhanced smooth slide animations (180ms duration, matching existing patterns)
 * - Integrated fade animations for smoother transitions
 * - Filter count calculation (total selected filter values)
 * - Sort and filter button interactions with enhanced feedback
 * - Extends existing header/bottom navigation animation system
 * - Elevated surface with shadow and smooth elevation transitions
 * - Haptic feedback integration
 * - FastOutSlowInEasing for natural motion feel
 */
@Composable
fun StickyFilterBar(
    visible: Boolean,
    sortBy: SortOption,
    appliedFilters: Map<String, AppliedFilterValue>,
    onSortClick: () -> Unit,
    onFilterClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    // Calculate total filter count
    val filterCount = appliedFilters.values.sumOf { filterValue ->
        when (filterValue) {
            is AppliedFilterValue.MultiSelect -> filterValue.values.size
            is AppliedFilterValue.Range -> 1
            is AppliedFilterValue.SingleValue -> 1
        }
    }
    
    // Enhanced elevation animation for smooth transitions
    val elevation by animateFloatAsState(
        targetValue = if (visible) 8f else 0f,
        animationSpec = spring(
            dampingRatio = 0.8f,
            stiffness = 400f
        ),
        label = "sticky_filter_bar_elevation"
    )
    
    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(
            animationSpec = tween(
                durationMillis = 180,
                easing = FastOutSlowInEasing // Matching existing navigation patterns
            ),
            initialOffsetY = { -it }
        ) + fadeIn(
            animationSpec = tween(
                durationMillis = 180,
                easing = FastOutSlowInEasing
            )
        ),
        exit = slideOutVertically(
            animationSpec = tween(
                durationMillis = 180,
                easing = FastOutSlowInEasing
            ),
            targetOffsetY = { -it }
        ) + fadeOut(
            animationSpec = tween(
                durationMillis = 180,
                easing = FastOutSlowInEasing
            )
        )
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .shadow(
                    elevation = elevation.dp,
                    shape = RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp)
                ),
            shape = RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = elevation.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Sort button
                FilterButton(
                    text = "Sort",
                    icon = {
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = "Sort options",
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    },
                    onClick = onSortClick,
                    modifier = Modifier.weight(1f),
                    hapticFeedback = hapticFeedback
                )
                
                // Filter button with count
                FilterButton(
                    text = "Filters",
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Filter options",
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    },
                    onClick = onFilterClick,
                    modifier = Modifier.weight(1f),
                    badgeCount = filterCount,
                    hapticFeedback = hapticFeedback
                )
            }
        }
    }
}

/**
 * StickyFilterBarContainer Component
 * Container that positions the sticky filter bar as an overlay
 * 
 * Features:
 * - Proper z-index positioning above content
 * - Full width positioning
 * - Transparent background to allow content scrolling underneath
 */
@Composable
fun StickyFilterBarContainer(
    visible: Boolean,
    sortBy: SortOption,
    appliedFilters: Map<String, AppliedFilterValue>,
    onSortClick: () -> Unit,
    onFilterClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    Box(
        modifier = modifier.fillMaxWidth()
    ) {
        StickyFilterBar(
            visible = visible,
            sortBy = sortBy,
            appliedFilters = appliedFilters,
            onSortClick = onSortClick,
            onFilterClick = onFilterClick,
            modifier = Modifier.align(Alignment.TopCenter),
            hapticFeedback = hapticFeedback
        )
    }
}