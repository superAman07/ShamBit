package com.shambit.customer.presentation.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Professional empty state component for products
 * Displays when no products are available with an illustration, message, and retry button
 * 
 * @param message The message to display to the user
 * @param onRetry Callback when the "Try Again" button is clicked
 * @param modifier Modifier for customization
 */
@Composable
fun EmptyProductsState(
    message: String = "No products available",
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Shopping cart icon as illustration
        Icon(
            imageVector = Icons.Outlined.ShoppingCart,
            contentDescription = null,
            modifier = Modifier.size(120.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Title
        Text(
            text = "No Products Found",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Message
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        // Try Again button (if onRetry is provided)
        if (onRetry != null) {
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onRetry,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "Try Again",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }
        }
    }
}

/**
 * Empty state for featured products section
 * Displays when no featured products are available
 */
@Composable
fun EmptyFeaturedProductsState(
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    EmptyProductsState(
        message = "No featured products available at the moment. Check back later!",
        onRetry = onRetry,
        modifier = modifier
    )
}

/**
 * Empty state for search results
 * Displays when no products match the search query
 */
@Composable
fun EmptySearchResultsState(
    query: String = "",
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val message = if (query.isNotEmpty()) {
        "No products found for \"$query\". Try adjusting your search."
    } else {
        "No products found. Try a different search term."
    }
    
    EmptyProductsState(
        message = message,
        onRetry = onRetry,
        modifier = modifier
    )
}

/**
 * Empty state for category products
 * Displays when a category has no products
 */
@Composable
fun EmptyCategoryProductsState(
    categoryName: String = "",
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val message = if (categoryName.isNotEmpty()) {
        "No products available in $categoryName. Check back later!"
    } else {
        "No products available in this category. Check back later!"
    }
    
    EmptyProductsState(
        message = message,
        onRetry = onRetry,
        modifier = modifier
    )
}
