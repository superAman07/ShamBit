package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.shambit.customer.util.HapticFeedbackManager

/**
 * ScrollToTopButton Component
 * Floating scroll-to-top button with accessibility support
 * 
 * Features:
 * - Circular floating action button design
 * - Smooth scroll-to-top animation using existing patterns
 * - Fade show/hide animations based on scroll position
 * - 48dp minimum touch target for accessibility
 * - Scale animation on press (1.0x → 0.9x when pressed)
 * - Elevated shadow for floating appearance
 * - Haptic feedback on tap
 * - Proper accessibility labels and semantics
 * - Primary color scheme integration
 */
@Composable
fun ScrollToTopButton(
    visible: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    // Scale animation: 1.0x → 0.9x when pressed
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.9f else 1.0f,
        animationSpec = tween(durationMillis = 100),
        label = "scroll_to_top_scale"
    )
    
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(
            animationSpec = tween(durationMillis = 200)
        ) + scaleIn(
            animationSpec = tween(durationMillis = 200)
        ),
        exit = fadeOut(
            animationSpec = tween(durationMillis = 200)
        ) + scaleOut(
            animationSpec = tween(durationMillis = 200)
        )
    ) {
        Card(
            modifier = modifier
                .size(56.dp) // 56dp for comfortable touch target (exceeds 48dp minimum)
                .shadow(
                    elevation = 8.dp,
                    shape = CircleShape
                )
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .clickable(
                    interactionSource = interactionSource,
                    indication = null
                ) {
                    hapticFeedback?.performMediumImpact()
                    onClick()
                }
                .semantics {
                    contentDescription = "Scroll to top"
                    role = androidx.compose.ui.semantics.Role.Button
                },
            shape = CircleShape,
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Box(
                modifier = Modifier.size(56.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.KeyboardArrowUp,
                    contentDescription = null, // Handled by parent semantics
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * ScrollToTopButtonContainer Component
 * Container that positions the scroll-to-top button as a floating overlay
 * 
 * Features:
 * - Positions button in bottom-right corner with proper margins
 * - Ensures button doesn't interfere with existing content
 * - Provides consistent positioning across different screen sizes
 * - Accounts for bottom navigation bar spacing
 */
@Composable
fun ScrollToTopButtonContainer(
    visible: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    Box(
        modifier = modifier
    ) {
        ScrollToTopButton(
            visible = visible,
            onClick = onClick,
            modifier = Modifier.align(Alignment.BottomEnd),
            hapticFeedback = hapticFeedback
        )
    }
}

/**
 * ScrollToTopButtonWithPadding Component
 * Scroll-to-top button with built-in padding for easy positioning
 * 
 * Features:
 * - 16dp padding from edges for comfortable spacing
 * - 80dp bottom padding to account for bottom navigation
 * - Ready-to-use component for overlay positioning
 */
@Composable
fun ScrollToTopButtonWithPadding(
    visible: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hapticFeedback: HapticFeedbackManager? = null
) {
    Box(
        modifier = modifier
    ) {
        ScrollToTopButton(
            visible = visible,
            onClick = onClick,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 80.dp), // Account for bottom navigation
            hapticFeedback = hapticFeedback
        )
    }
}