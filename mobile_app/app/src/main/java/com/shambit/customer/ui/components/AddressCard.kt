package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star

import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import kotlinx.coroutines.delay

/**
 * AddressCard composable for displaying address information
 * 
 * Features:
 * - Address type icon and badge
 * - Full address display with proper formatting
 * - Selection state with visual feedback
 * - Action buttons (Edit, Delete, Set as Default)
 * - Default address indicator
 * - Tap animation and haptic feedback
 * 
 * @param address The address to display
 * @param isSelected Whether this address is currently selected
 * @param showActions Whether to show action buttons (Edit, Delete, Set Default)
 * @param onEdit Callback for edit action
 * @param onDelete Callback for delete action
 * @param onSetDefault Callback for set as default action
 * @param onClick Callback for card tap (for selection)
 * @param modifier Modifier for customization
 */
@Composable
fun AddressCard(
    address: Address,
    isSelected: Boolean = false,
    showActions: Boolean = false,
    onEdit: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null,
    onSetDefault: (() -> Unit)? = null,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    var isVisible by remember { mutableStateOf(false) }
    
    // Animate card entrance
    LaunchedEffect(Unit) {
        delay(50) // Small delay for staggered entrance
        isVisible = true
    }
    
    // Enhanced animations with spring physics
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else if (isSelected) 1.02f else 1.0f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = 400f),
        label = "address_card_scale"
    )
    
    // Smooth elevation animation
    val elevation by animateFloatAsState(
        targetValue = if (isSelected) 12f else if (isPressed) 8f else 3f,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = 300f),
        label = "address_card_elevation"
    )
    
    // Border animation for selection
    val borderAlpha by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "address_card_border"
    )
    
    AnimatedVisibility(
        visible = isVisible,
        enter = scaleIn(
            initialScale = 0.9f,
            animationSpec = spring(dampingRatio = 0.7f)
        ) + fadeIn(animationSpec = tween(300)),
        exit = scaleOut(
            targetScale = 0.9f,
            animationSpec = tween(200)
        ) + fadeOut(animationSpec = tween(200))
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                }
                .then(
                    if (onClick != null) {
                        Modifier
                            .clickable(
                                interactionSource = interactionSource,
                                indication = null
                            ) { 
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onClick() 
                            }
                            .semantics {
                                role = Role.Button
                                contentDescription = buildAddressContentDescription(address, isSelected)
                                if (isSelected) {
                                    stateDescription = "Selected"
                                }
                            }
                    } else Modifier.semantics {
                        contentDescription = buildAddressContentDescription(address, isSelected)
                        if (isSelected) {
                            stateDescription = "Selected"
                        }
                    }
                )
                .then(
                    if (borderAlpha > 0f) {
                        Modifier.border(
                            width = (2 * borderAlpha).dp,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = borderAlpha),
                            shape = RoundedCornerShape(12.dp)
                        )
                    } else Modifier
                ),
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = elevation.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isSelected) {
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f)
                } else {
                    MaterialTheme.colorScheme.surface
                }
            )
        ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header row with type icon, name, and selection indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Address type icon
                    Icon(
                        imageVector = getAddressTypeIcon(address.type),
                        contentDescription = null, // Handled by parent semantics
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    
                    // Address type badge
                    Box(
                        modifier = Modifier
                            .background(
                                MaterialTheme.colorScheme.primaryContainer,
                                RoundedCornerShape(6.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = address.type.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    
                    // Default address indicator
                    if (address.isDefault) {
                        Box(
                            modifier = Modifier
                                .background(
                                    MaterialTheme.colorScheme.tertiaryContainer,
                                    RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null, // Handled by parent semantics
                                    tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    text = "Default",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
                
                // Selection indicator with smooth animation
                AnimatedVisibility(
                    visible = isSelected,
                    enter = scaleIn(
                        initialScale = 0.5f,
                        animationSpec = spring(dampingRatio = 0.6f)
                    ) + fadeIn(animationSpec = tween(200)),
                    exit = scaleOut(
                        targetScale = 0.5f,
                        animationSpec = tween(150)
                    ) + fadeOut(animationSpec = tween(150))
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(
                                MaterialTheme.colorScheme.primary,
                                RoundedCornerShape(12.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null, // Handled by parent semantics
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Address details
            Column(
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Name and phone
                Text(
                    text = "${address.name} • ${address.phoneNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                // House/Street/Area
                Text(
                    text = address.houseStreetArea,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                // City and Pincode
                Text(
                    text = "${address.city} - ${address.pincode}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
            }
            
            // Action buttons with staggered animations
            AnimatedVisibility(
                visible = showActions,
                enter = fadeIn(animationSpec = tween(300, delayMillis = 100)) +
                        scaleIn(initialScale = 0.9f, animationSpec = tween(300, delayMillis = 100)),
                exit = fadeOut(animationSpec = tween(200)) +
                       scaleOut(targetScale = 0.9f, animationSpec = tween(200))
            ) {
                Column {
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Edit button with haptic feedback
                        if (onEdit != null) {
                            OutlinedButton(
                                onClick = {
                                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                    onEdit()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .semantics {
                                        contentDescription = "Edit ${address.type.displayName} address for ${address.name}"
                                    },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Edit")
                            }
                        }
                        
                        // Set as Default button with haptic feedback
                        if (onSetDefault != null && !address.isDefault) {
                            OutlinedButton(
                                onClick = {
                                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                    onSetDefault()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .semantics {
                                        contentDescription = "Set ${address.type.displayName} address for ${address.name} as default"
                                    },
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Default")
                            }
                        }
                        
                        // Delete button with enhanced haptic feedback
                        if (onDelete != null) {
                            IconButton(
                                onClick = {
                                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                    onDelete()
                                },
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.1f))
                                    .semantics {
                                        contentDescription = "Delete ${address.type.displayName} address for ${address.name}"
                                    }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
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

/**
 * Build comprehensive content description for accessibility
 */
private fun buildAddressContentDescription(address: Address, isSelected: Boolean): String {
    val selectionState = if (isSelected) "Selected" else "Not selected"
    val defaultState = if (address.isDefault) "Default address" else ""
    
    return buildString {
        append("${address.type.displayName} address")
        if (defaultState.isNotEmpty()) {
            append(", $defaultState")
        }
        append(", $selectionState")
        append(", ${address.name}")
        append(", ${address.houseStreetArea}")
        append(", ${address.city}")
        append(", ${address.pincode}")
        append(", Phone ${address.phoneNumber}")
    }
}