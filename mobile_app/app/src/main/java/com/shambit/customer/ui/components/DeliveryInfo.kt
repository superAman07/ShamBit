package com.shambit.customer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * DeliveryInfo Component
 * 
 * Features:
 * - Display quick delivery time (e.g., "10 mins", "2 hours", "Today")
 * - Display standard delivery date (e.g., "Tomorrow", "Dec 15")
 * - Use primary color for quick delivery (< 2 hours)
 * - Use secondary color for standard delivery
 * - Clock emoji icon
 */
@Composable
fun DeliveryInfo(
    deliveryTime: String?,
    modifier: Modifier = Modifier
) {
    if (deliveryTime == null) return
    
    val isQuickDelivery = isQuickDelivery(deliveryTime)
    
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "🕒",
            style = MaterialTheme.typography.labelSmall
        )
        
        Text(
            text = deliveryTime,
            style = MaterialTheme.typography.labelSmall,
            color = if (isQuickDelivery) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            fontWeight = if (isQuickDelivery) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}

/**
 * Check if delivery is quick (< 2 hours)
 */
fun isQuickDelivery(deliveryTime: String): Boolean {
    val lowerTime = deliveryTime.lowercase()
    return when {
        lowerTime.contains("min") -> true
        lowerTime.contains("hour") -> {
            // Extract hour number
            val hourMatch = Regex("(\\d+)\\s*hour").find(lowerTime)
            val hours = hourMatch?.groupValues?.get(1)?.toIntOrNull() ?: 3
            hours < 2
        }
        lowerTime.contains("today") -> true
        else -> false
    }
}

/**
 * Format delivery time from minutes
 */
fun formatDeliveryTime(deliveryMinutes: Int?): String? {
    if (deliveryMinutes == null) return null
    
    return when {
        deliveryMinutes < 60 -> "$deliveryMinutes mins"
        deliveryMinutes < 120 -> "${deliveryMinutes / 60} hour"
        deliveryMinutes < 1440 -> "${deliveryMinutes / 60} hours"
        deliveryMinutes < 2880 -> "Tomorrow"
        else -> "${deliveryMinutes / 1440} days"
    }
}
