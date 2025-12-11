package com.shambit.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * CircularBadge Component
 * 
 * A perfectly circular badge for displaying counts, notifications, or status indicators.
 * Ensures the badge is always a complete circle regardless of content.
 * 
 * Features:
 * - Perfect circle shape
 * - Customizable size and colors
 * - Automatic text sizing for different badge sizes
 * - Handles large numbers with "99+" format
 * 
 * @param count The number to display in the badge
 * @param modifier Modifier for customization
 * @param size Size of the circular badge
 * @param backgroundColor Background color of the badge
 * @param textColor Text color
 * @param fontSize Font size for the text
 * @param maxDisplayCount Maximum count to display before showing "99+"
 */
@Composable
fun CircularBadge(
    count: Int,
    modifier: Modifier = Modifier,
    size: Dp = 20.dp,
    backgroundColor: Color = MaterialTheme.colorScheme.error,
    textColor: Color = MaterialTheme.colorScheme.onError,
    fontSize: TextUnit = 10.sp,
    maxDisplayCount: Int = 99
) {
    if (count > 0) {
        Box(
            modifier = modifier
                .size(size)
                .background(
                    color = backgroundColor,
                    shape = CircleShape
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.3f),
                    shape = CircleShape
                )
                .padding(1.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (count > maxDisplayCount) "${maxDisplayCount}+" else count.toString(),
                color = textColor,
                fontSize = fontSize,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 1,
                style = MaterialTheme.typography.labelSmall.copy(
                    lineHeight = fontSize,
                    lineHeightStyle = LineHeightStyle(
                        alignment = LineHeightStyle.Alignment.Center,
                        trim = LineHeightStyle.Trim.Both
                    )
                )
            )
        }
    }
}

/**
 * Preview Composables
 */
@androidx.compose.ui.tooling.preview.Preview(
    name = "Circular Badge - Small Count",
    showBackground = true
)
@Composable
private fun CircularBadgeSmallPreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        CircularBadge(count = 3)
    }
}

@androidx.compose.ui.tooling.preview.Preview(
    name = "Circular Badge - Large Count",
    showBackground = true
)
@Composable
private fun CircularBadgeLargePreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        CircularBadge(count = 150)
    }
}

@androidx.compose.ui.tooling.preview.Preview(
    name = "Circular Badge - Different Sizes",
    showBackground = true
)
@Composable
private fun CircularBadgeSizesPreview() {
    com.shambit.customer.ui.theme.ShamBitTheme {
        androidx.compose.foundation.layout.Row(
            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
        ) {
            CircularBadge(count = 1, size = 16.dp, fontSize = 8.sp)
            CircularBadge(count = 5, size = 20.dp, fontSize = 10.sp)
            CircularBadge(count = 12, size = 24.dp, fontSize = 12.sp)
        }
    }
}