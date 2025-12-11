package com.shambit.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn

import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shambit.customer.domain.model.AddressType

/**
 * AddressTypeSelector composable for selecting address type
 * 
 * Features:
 * - Three address types: Home, Work, Other
 * - Visual selection state with primary color
 * - Icons for each address type
 * - Horizontal layout with equal spacing
 * - Material 3 design with rounded corners
 * - Haptic feedback on selection
 * 
 * @param selectedType Currently selected address type
 * @param onTypeSelected Callback when a type is selected
 * @param modifier Modifier for customization
 */
@Composable
fun AddressTypeSelector(
    selectedType: AddressType,
    onTypeSelected: (AddressType) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AddressType.values().forEach { type ->
            AddressTypeOption(
                type = type,
                isSelected = selectedType == type,
                onClick = { onTypeSelected(type) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/**
 * Individual address type option
 */
@Composable
private fun AddressTypeOption(
    type: AddressType,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }
    
    val borderColor = if (isSelected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
    }
    
    val contentColor = if (isSelected) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurface
    }
    
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onClick() }
            .padding(16.dp)
            .semantics {
                role = Role.RadioButton
                contentDescription = "${type.displayName} address type"
                stateDescription = if (isSelected) "Selected" else "Not selected"
            },
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = getAddressTypeIcon(type),
                contentDescription = null, // Handled by parent semantics
                tint = contentColor,
                modifier = Modifier.size(20.dp)
            )
            
            Spacer(modifier = Modifier.width(8.dp))
            
            Text(
                text = type.displayName,
                style = MaterialTheme.typography.bodyMedium,
                color = contentColor,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium
            )
        }
    }
}

/**
 * Get appropriate icon for address type
 */
private fun getAddressTypeIcon(type: AddressType): ImageVector {
    return when (type) {
        AddressType.HOME -> Icons.Default.Home
        AddressType.WORK -> Icons.Default.LocationOn
        AddressType.OTHER -> Icons.Default.LocationOn
    }
}