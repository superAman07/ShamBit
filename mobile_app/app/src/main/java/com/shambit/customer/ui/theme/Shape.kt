package com.shambit.customer.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * ShamBit shape system with rounded corner specifications
 * Used consistently across all UI components for visual harmony
 */
val Shapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),   // Small elements like chips
    small = RoundedCornerShape(8.dp),        // Buttons, small cards
    medium = RoundedCornerShape(12.dp),      // Cards, banners, product images
    large = RoundedCornerShape(16.dp),       // Large cards, bottom sheets
    extraLarge = RoundedCornerShape(28.dp)   // Dialogs, large containers
)
