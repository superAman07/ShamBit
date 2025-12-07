package com.shambit.customer.ui.components

import androidx.compose.foundation.background
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
 * Stock Status Enum
 */
enum class StockStatus {
    IN_STOCK,
    LOW_STOCK,
    OUT_OF_STOCK
}

/**
 * StockBadge Component
 * 
 * Features:
 * - Color-coded states (green, orange, red)
 * - "In Stock" badge in success color
 * - "Out of Stock" badge in error color
 * - "Low Stock" badge in warning color
 * - "Only X left" for low stock items (X < 5)
 * - Semi-transparent background for readability
 */
@Composable
fun StockBadge(
    stockQuantity: Int,
    modifier: Modifier = Modifier
) {
    val stockStatus = when {
        stockQuantity <= 0 -> StockStatus.OUT_OF_STOCK
        stockQuantity < 5 -> StockStatus.LOW_STOCK
        else -> StockStatus.IN_STOCK
    }
    
    val (text, backgroundColor, textColor) = when (stockStatus) {
        StockStatus.IN_STOCK -> Triple(
            "In Stock",
            EcommerceColors.StockInStock.copy(alpha = 0.9f),
            Color.White
        )
        StockStatus.LOW_STOCK -> Triple(
            "Only $stockQuantity left",
            EcommerceColors.StockLowStock.copy(alpha = 0.9f),
            Color.White
        )
        StockStatus.OUT_OF_STOCK -> Triple(
            "Out of Stock",
            EcommerceColors.StockOutOfStock.copy(alpha = 0.9f),
            Color.White
        )
    }
    
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = textColor,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 6.dp, vertical = 3.dp)
    )
}

/**
 * Get stock status from quantity
 */
fun getStockStatus(stockQuantity: Int): StockStatus {
    return when {
        stockQuantity <= 0 -> StockStatus.OUT_OF_STOCK
        stockQuantity < 5 -> StockStatus.LOW_STOCK
        else -> StockStatus.IN_STOCK
    }
}

/**
 * Check if product is out of stock
 */
fun isOutOfStock(stockQuantity: Int): Boolean {
    return stockQuantity <= 0
}
