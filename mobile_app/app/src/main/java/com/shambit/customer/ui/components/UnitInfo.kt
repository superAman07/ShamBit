package com.shambit.customer.ui.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight

/**
 * UnitInfo Component
 * 
 * Features:
 * - Display weight (e.g., "500g", "1kg", "2.5kg")
 * - Display volume (e.g., "250ml", "1L", "500ml")
 * - Display count (e.g., "Pack of 6", "12 pieces")
 * - Secondary text color and smaller font
 * - Handle products without unit info gracefully
 */
@Composable
fun UnitInfo(
    unitSize: String?,
    unitType: String?,
    modifier: Modifier = Modifier
) {
    val unitText = formatUnitInfo(unitSize, unitType)
    
    if (unitText != null) {
        Text(
            text = unitText,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Normal,
            modifier = modifier
        )
    }
}

/**
 * Format unit information
 */
fun formatUnitInfo(unitSize: String?, unitType: String?): String? {
    if (unitSize == null || unitType == null) return null
    
    return when (unitType.lowercase()) {
        "weight", "kg", "g", "gram", "kilogram" -> {
            // Format weight
            val size = unitSize.toDoubleOrNull() ?: return "$unitSize $unitType"
            when {
                size >= 1000 -> "${size / 1000}kg"
                else -> "${size.toInt()}g"
            }
        }
        "volume", "l", "ml", "liter", "milliliter" -> {
            // Format volume
            val size = unitSize.toDoubleOrNull() ?: return "$unitSize $unitType"
            when {
                size >= 1000 -> "${size / 1000}L"
                else -> "${size.toInt()}ml"
            }
        }
        "count", "pack", "pieces", "pcs" -> {
            // Format count
            val size = unitSize.toIntOrNull() ?: return "$unitSize $unitType"
            when {
                size == 1 -> "1 piece"
                size > 1 -> "Pack of $size"
                else -> "$unitSize $unitType"
            }
        }
        else -> {
            // Default format
            "$unitSize $unitType"
        }
    }
}
