package com.shambit.customer.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.shambit.customer.domain.model.Address
import kotlinx.coroutines.delay

/**
 * AddressSelectionBottomSheet composable for selecting delivery addresses
 * 
 * This bottom sheet displays all saved addresses with selection indicators,
 * allows immediate address selection, and provides navigation to add/manage addresses.
 * 
 * Features:
 * - Displays all addresses with tick mark on selected address
 * - Immediate address selection with bottom sheet dismissal
 * - "Add New Address" button with navigation
 * - "Manage Addresses" button with navigation
 * - Smooth open/close animations
 * - Empty state handling
 * - Proper accessibility support
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * @param addresses List of all saved addresses
 * @param selectedAddressId ID of the currently selected address
 * @param onAddressSelected Callback when an address is selected
 * @param onAddNewAddress Callback to navigate to add address form
 * @param onManageAddresses Callback to navigate to manage addresses page
 * @param onDismiss Callback when bottom sheet is dismissed
 * @param modifier Modifier for customization
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionBottomSheet(
    addresses: List<Address>,
    selectedAddressId: String?,
    onAddressSelected: (Address) -> Unit,
    onAddNewAddress: () -> Unit,
    onManageAddresses: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
) {
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    // Animate content visibility with delay for smooth entrance
    LaunchedEffect(Unit) {
        delay(100) // Small delay for smooth entrance
        isVisible = true
    }
    
    ModalBottomSheet(
        onDismissRequest = {
            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
            onDismiss()
        },
        sheetState = sheetState,
        modifier = modifier,
        dragHandle = {
            // Custom drag handle with close button and smooth animations
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { -it },
                    animationSpec = spring(dampingRatio = 0.8f)
                ) + fadeIn(animationSpec = tween(300)),
                exit = slideOutVertically(
                    targetOffsetY = { -it },
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        // Centered drag handle with subtle animation
                        val dragHandleAlpha by animateFloatAsState(
                            targetValue = if (isVisible) 0.4f else 0f,
                            animationSpec = tween(durationMillis = 300),
                            label = "drag_handle_alpha"
                        )
                        
                        Box(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .width(32.dp)
                                .height(4.dp)
                                .background(
                                    MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dragHandleAlpha),
                                    RoundedCornerShape(2.dp)
                                )
                        )
                        
                        // Close button with haptic feedback
                        IconButton(
                            onClick = {
                                hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                                onDismiss()
                            },
                            modifier = Modifier
                                .align(Alignment.CenterEnd)
                                .semantics {
                                    contentDescription = "Close address selection bottom sheet"
                                }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    )
                }
            }
        },
        windowInsets = BottomSheetDefaults.windowInsets
    ) {
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 2 },
                animationSpec = spring(dampingRatio = 0.8f)
            ) + fadeIn(animationSpec = tween(400)),
            exit = slideOutVertically(
                targetOffsetY = { it / 2 },
                animationSpec = tween(200)
            ) + fadeOut(animationSpec = tween(200))
        ) {
            AddressSelectionContent(
                addresses = addresses,
                selectedAddressId = selectedAddressId,
                onAddressSelected = { address ->
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    onAddressSelected(address)
                    onDismiss() // Close bottom sheet immediately after selection
                },
                onAddNewAddress = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAddNewAddress()
                },
                onManageAddresses = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                    onManageAddresses()
                }
            )
        }
    }
}

/**
 * Content of the address selection bottom sheet
 */
@Composable
private fun AddressSelectionContent(
    addresses: List<Address>,
    selectedAddressId: String?,
    onAddressSelected: (Address) -> Unit,
    onAddNewAddress: () -> Unit,
    onManageAddresses: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 16.dp)
    ) {
        // Header
        Text(
            text = "Select Delivery Address",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(vertical = 8.dp)
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        if (addresses.isEmpty()) {
            // Empty state
            EmptyAddressSelectionState(
                onAddNewAddress = onAddNewAddress,
                modifier = Modifier.padding(vertical = 32.dp)
            )
        } else {
            // Address list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 8.dp),
                modifier = Modifier.weight(1f, fill = false)
            ) {
                items(
                    items = addresses,
                    key = { address -> address.id }
                ) { address ->
                    AddressSelectionCard(
                        address = address,
                        isSelected = address.id == selectedAddressId,
                        onClick = { onAddressSelected(address) }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Action buttons
            ActionButtons(
                onAddNewAddress = onAddNewAddress,
                onManageAddresses = onManageAddresses
            )
        }
    }
}

/**
 * Address card for selection in bottom sheet with enhanced animations
 */
@Composable
private fun AddressSelectionCard(
    address: Address,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    val interactionSource = remember { MutableInteractionSource() }
    
    // Enhanced animations for selection state
    val animatedElevation by animateFloatAsState(
        targetValue = if (isSelected) 6f else 2f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = 300f),
        label = "address_selection_elevation"
    )
    
    val animatedScale by animateFloatAsState(
        targetValue = if (isSelected) 1.02f else 1f,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = 400f),
        label = "address_selection_scale"
    )
    
    val animatedBorderAlpha by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = tween(durationMillis = 250),
        label = "address_selection_border"
    )
    
    Box(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer {
                shadowElevation = animatedElevation
                scaleX = animatedScale
                scaleY = animatedScale
            }
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) {
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f)
                } else {
                    MaterialTheme.colorScheme.surface
                }
            )
            .then(
                if (animatedBorderAlpha > 0f) {
                    Modifier.background(
                        MaterialTheme.colorScheme.primary.copy(alpha = animatedBorderAlpha * 0.2f),
                        RoundedCornerShape(12.dp)
                    )
                } else Modifier
            )
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) {
                hapticFeedback.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .semantics {
                role = Role.Button
                contentDescription = buildString {
                    append("Select ${address.type.displayName} address for ${address.name}")
                    if (isSelected) {
                        append(", currently selected")
                    }
                    append(", ${address.houseStreetArea}, ${address.city}")
                }
            }
            .padding(16.dp)
    ) {
        AddressCard(
            address = address,
            isSelected = isSelected,
            showActions = false,
            onClick = null // Handled by parent clickable
        )
    }
}

/**
 * Empty state for address selection with smooth animations
 */
@Composable
private fun EmptyAddressSelectionState(
    onAddNewAddress: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        delay(200) // Delay for smooth entrance
        isVisible = true
    }
    
    AnimatedVisibility(
        visible = isVisible,
        enter = scaleIn(
            initialScale = 0.8f,
            animationSpec = spring(dampingRatio = 0.7f)
        ) + fadeIn(animationSpec = tween(400)),
        exit = scaleOut(
            targetScale = 0.8f,
            animationSpec = tween(200)
        ) + fadeOut(animationSpec = tween(200))
    ) {
        Column(
            modifier = modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Empty state icon with pulse animation
            val pulseScale by animateFloatAsState(
                targetValue = if (isVisible) 1f else 0.9f,
                animationSpec = spring(dampingRatio = 0.6f),
                label = "empty_state_pulse"
            )
            
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                    }
                    .background(
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                        RoundedCornerShape(32.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(32.dp)
                )
            }
            
            // Empty state text with staggered animation
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { it / 4 },
                    animationSpec = tween(400, delayMillis = 100)
                ) + fadeIn(animationSpec = tween(400, delayMillis = 100))
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "No Addresses Found",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                    
                    Text(
                        text = "Add your first delivery address to continue",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
            
            // Add address button with entrance animation
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { it / 2 },
                    animationSpec = tween(400, delayMillis = 200)
                ) + fadeIn(animationSpec = tween(400, delayMillis = 200))
            ) {
                Button(
                    onClick = {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onAddNewAddress()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics {
                            contentDescription = "Add new address, navigate to address form"
                        }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add New Address")
                }
            }
        }
    }
}

/**
 * Action buttons for bottom sheet with staggered animations
 */
@Composable
private fun ActionButtons(
    onAddNewAddress: () -> Unit,
    onManageAddresses: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        delay(300) // Delay for staggered entrance
        isVisible = true
    }
    
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Add New Address button with entrance animation
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 3 },
                animationSpec = tween(300)
            ) + fadeIn(animationSpec = tween(300))
        ) {
            Button(
                onClick = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                    onAddNewAddress()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics {
                        contentDescription = "Add new address, navigate to address form"
                    },
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add New Address")
            }
        }
        
        // Manage Addresses button with delayed entrance animation
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(
                initialOffsetY = { it / 3 },
                animationSpec = tween(300, delayMillis = 100)
            ) + fadeIn(animationSpec = tween(300, delayMillis = 100))
        ) {
            OutlinedButton(
                onClick = {
                    hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                    onManageAddresses()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics {
                        contentDescription = "Manage addresses, navigate to address management page"
                    },
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Manage Addresses")
            }
        }
    }
}