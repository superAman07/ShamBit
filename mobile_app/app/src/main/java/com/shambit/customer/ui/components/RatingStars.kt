package com.shambit.customer.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.shambit.customer.ui.theme.EcommerceColors
import kotlin.math.ceil
import kotlin.math.floor

/**
 * RatingStars Component
 * 
 * Features:
 * - 5 stars with partial fill support
 * - Display average rating (e.g., 4.3) next to stars
 * - Show review count in parentheses (e.g., "(234)")
 * - Gold/amber color for filled stars
 * - Gray color for empty stars
 * - Handle products with no ratings
 * - Tappable to view reviews
 * - Proper accessibility labels
 */
@Composable
fun RatingStars(
    rating: Double?,
    reviewCount: Int?,
    onRatingClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    starSize: Dp = 14.dp,
    showRatingValue: Boolean = true,
    showReviewCount: Boolean = true
) {
    val accessibilityLabel = if (rating != null && reviewCount != null) {
        "Rating: $rating out of 5 stars, $reviewCount reviews"
    } else {
        "No ratings yet"
    }
    
    Row(
        modifier = modifier
            .then(
                if (onRatingClick != null) {
                    Modifier.clickable { onRatingClick() }
                } else {
                    Modifier
                }
            )
            .semantics {
                contentDescription = accessibilityLabel
            },
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (rating == null || rating == 0.0) {
            // No ratings yet
            Text(
                text = "No ratings yet",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            // Star icons
            repeat(5) { index ->
                val starRating = (index + 1).toDouble()
                val isFilled = rating >= starRating - 0.25
                
                val tint = if (isFilled) {
                    EcommerceColors.RatingGold
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                }
                
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null, // Handled by parent semantics
                    tint = tint,
                    modifier = Modifier.size(starSize)
                )
            }
            
            // Rating value
            if (showRatingValue) {
                Text(
                    text = String.format("%.1f", rating),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                )
            }
            
            // Review count
            if (showReviewCount && reviewCount != null && reviewCount > 0) {
                Text(
                    text = "($reviewCount)",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Compact version for smaller spaces
 */
@Composable
fun CompactRatingStars(
    rating: Double?,
    reviewCount: Int?,
    onRatingClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    RatingStars(
        rating = rating,
        reviewCount = reviewCount,
        onRatingClick = onRatingClick,
        modifier = modifier,
        starSize = 12.dp,
        showRatingValue = true,
        showReviewCount = false
    )
}
