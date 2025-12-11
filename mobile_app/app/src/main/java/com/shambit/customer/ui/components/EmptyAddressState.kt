package com.shambit.customer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * EmptyAddressState composable for displaying no address state
 * 
 * Features:
 * - Location icon with empty state styling
 * - Clear message about no addresses
 * - Call-to-action button to add address
 * - Different variants for different contexts
 * - Material 3 design with proper spacing
 * 
 * @param title Title text for the empty state
 * @param message Description message
 * @param actionText Text for the action button
 * @param onAction Callback when action button is clicked
 * @param modifier Modifier for customization
 */
@Composable
fun EmptyAddressState(
    title: String = "No Addresses Found",
    message: String = "You haven't added any delivery addresses yet. Add your first address to start ordering.",
    actionText: String = "Add Address",
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Location icon
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Title
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Message
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight
            )
            
            // Action button
            if (onAction != null) {
                Spacer(modifier = Modifier.height(32.dp))
                
                Button(
                    onClick = onAction,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.semantics {
                        contentDescription = "$actionText, navigate to address form"
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    
                    Spacer(modifier = Modifier.padding(horizontal = 4.dp))
                    
                    Text(
                        text = actionText,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}

/**
 * EmptyAddressState for checkout context
 */
@Composable
fun CheckoutEmptyAddressState(
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    EmptyAddressState(
        title = "Add Delivery Address",
        message = "Please add a delivery address to continue with your order. We need to know where to deliver your items.",
        actionText = "Add Address",
        onAction = onAddAddress,
        modifier = modifier
    )
}

/**
 * EmptyAddressState for manage addresses page
 */
@Composable
fun ManageAddressesEmptyState(
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    EmptyAddressState(
        title = "No Saved Addresses",
        message = "You haven't saved any addresses yet. Add your home, work, or other frequently used addresses for quick checkout.",
        actionText = "Add First Address",
        onAction = onAddAddress,
        modifier = modifier
    )
}

/**
 * EmptyAddressState for address selection bottom sheet
 */
@Composable
fun AddressSelectionEmptyState(
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    EmptyAddressState(
        title = "No Addresses Available",
        message = "Add your first delivery address to select it for your orders.",
        actionText = "Add Address",
        onAction = onAddAddress,
        modifier = modifier
    )
}

/**
 * EmptyAddressState for home screen (compact version)
 */
@Composable
fun HomeEmptyAddressState(
    onAddAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.LocationOn,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "No delivery address",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Button(
            onClick = onAddAddress,
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.semantics {
                contentDescription = "Add address, navigate to address form"
            }
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(16.dp)
            )
            
            Spacer(modifier = Modifier.padding(horizontal = 2.dp))
            
            Text(
                text = "Add Address",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
        }
    }
}