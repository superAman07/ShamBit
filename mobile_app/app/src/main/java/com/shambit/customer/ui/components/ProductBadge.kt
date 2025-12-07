package com.shambit.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shambit.customer.ui.theme.EcommerceColors

/**
 * Product Badge Type Enum
 */
enum class ProductBadgeType(
    val label: String,
    val backgroundColor: Color,
    val textColor: Color
) {
    BESTSELLER(
        label = "Bestseller",
        backgroundColor = EcommerceColors.BadgeBestseller,
        textColor = EcommerceColors.BadgeBestsellerText
    ),
    NEW(
        label = "New",
        backgroundColor = EcommerceColors.BadgeNew,
        textColor = Color.White
    ),
    TRENDING(
        label = "Trending",
        backgroundColor = EcommerceColors.BadgeTrending,
        textColor = Color.White
    ),
    ECO_FRIENDLY(
        label = "Eco-friendly",
        backgroundColor = EcommerceColors.BadgeEcoFriendly,
        textColor = Color.White
    ),
    LIMITED_OFFER(
        label = "Limited Offer",
        backgroundColor = EcommerceColors.BadgeLimitedOffer,
        textColor = Color.White
    )
}

/**
 * ProductBadge Component
 * 
 * Features:
 * - Customizable colors based on badge type
 * - "Bestseller" badge in gold color
 * - "New" badge in blue color
 * - "Trending" badge in purple color
 * - "Eco-friendly" badge in green color (ShamBit brand alignment)
 * - "Limited Offer" badge in red color
 * - Semi-transparent background
 */
@Composable
fun ProductBadge(
    badgeType: ProductBadgeType,
    modifier: Modifier = Modifier
) {
    Text(
        text = badgeType.label,
        style = MaterialTheme.typography.labelSmall,
        color = badgeType.textColor,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .background(
                color = badgeType.backgroundColor.copy(alpha = 0.95f),
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 6.dp, vertical = 3.dp)
    )
}

/**
 * ProductBadges Component
 * Displays multiple badges stacked vertically
 * 
 * Features:
 * - Support multiple badges
 * - Stack vertically with 4dp spacing
 */
@Composable
fun ProductBadges(
    badges: List<ProductBadgeType>,
    modifier: Modifier = Modifier
) {
    if (badges.isEmpty()) return
    
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        badges.forEach { badgeType ->
            ProductBadge(badgeType = badgeType)
        }
    }
}

/**
 * Parse badge strings to ProductBadgeType
 */
fun parseBadges(badgeStrings: List<String>?): List<ProductBadgeType> {
    if (badgeStrings == null) return emptyList()
    
    return badgeStrings.mapNotNull { badge ->
        when (badge.lowercase()) {
            "bestseller" -> ProductBadgeType.BESTSELLER
            "new" -> ProductBadgeType.NEW
            "trending" -> ProductBadgeType.TRENDING
            "eco-friendly", "eco_friendly", "ecofriendly" -> ProductBadgeType.ECO_FRIENDLY
            "limited offer", "limited_offer", "limitedoffer" -> ProductBadgeType.LIMITED_OFFER
            else -> null
        }
    }
}
