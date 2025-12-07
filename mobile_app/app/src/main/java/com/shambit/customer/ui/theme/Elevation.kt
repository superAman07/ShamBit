package com.shambit.customer.ui.theme

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * ShamBit elevation system for consistent shadows across the app
 * Used to create visual hierarchy and depth
 */
object Elevation {
    val level0: Dp = 0.dp   // No elevation - flat elements
    val level1: Dp = 1.dp   // Subtle elevation - slight separation
    val level2: Dp = 2.dp   // Low elevation - cards, product cards
    val level3: Dp = 4.dp   // Medium elevation - headers, raised cards
    val level4: Dp = 6.dp   // High elevation - FAB, important elements
    val level5: Dp = 8.dp   // Highest elevation - bottom nav, modals
}
