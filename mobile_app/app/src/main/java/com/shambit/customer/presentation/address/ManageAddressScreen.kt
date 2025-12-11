package com.shambit.customer.presentation.address

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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.domain.model.Address
import com.shambit.customer.ui.components.AddressCard
import com.shambit.customer.ui.components.DeleteConfirmationDialog
import com.shambit.customer.ui.components.ManageAddressesEmptyState
import kotlinx.coroutines.delay

/**
 * ManageAddressScreen composable for comprehensive address management
 * 
 * Features:
 * - Display all addresses with full details and type badges
 * - Edit, Delete, and Set as Default buttons for each address
 * - Delete confirmation dialog
 * - "Add New Address" FAB
 * - Empty state display
 * - Toast notifications for operations
 * - Loading and error states
 * - Pull-to-refresh functionality
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param viewModel The AddressViewModel for state management
 * @param onNavigateBack Callback when back button is pressed
 * @param onNavigateToAddAddress Callback to navigate to add address screen
 * @param onNavigateToEditAddress Callback to navigate to edit address screen
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageAddressScreen(
    viewModel: AddressViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToAddAddress: () -> Unit = {},
    onNavigateToEditAddress: (String) -> Unit = {}
) {
    val hapticFeedback = LocalHapticFeedback.current
    val addressesState by viewModel.addressesState.collectAsState()
    val operationState by viewModel.operationState.collectAsState()
    val addressToDelete by viewModel.addressToDelete.collectAsState()
    
    val snackbarHostState = remember { SnackbarHostState() }
    var isVisible by remember { mutableStateOf(false) }
    
    // Animate screen entrance
    LaunchedEffect(Unit) {
        delay(100)
        isVisible = true
    }
    
    // Show toast notifications for operations
    LaunchedEffect(operationState) {
        when (val state = operationState) {
            is OperationState.Success -> {
                snackbarHostState.showSnackbar(
                    message = state.message,
                    withDismissAction = true
                )
            }
            is OperationState.Error -> {
                snackbarHostState.showSnackbar(
                    message = state.message,
                    withDismissAction = true
                )
            }
            else -> { /* No action needed */ }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Manage Addresses",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.semantics {
                            contentDescription = "Navigate back to previous screen"
                        }
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        floatingActionButton = {
            AnimatedVisibility(
                visible = isVisible,
                enter = scaleIn(
                    initialScale = 0.5f,
                    animationSpec = spring(dampingRatio = 0.6f)
                ) + fadeIn(animationSpec = tween(400, delayMillis = 300)),
                exit = scaleOut(
                    targetScale = 0.5f,
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                val fabScale by animateFloatAsState(
                    targetValue = if (isVisible) 1f else 0.8f,
                    animationSpec = spring(dampingRatio = 0.7f),
                    label = "fab_scale"
                )
                
                FloatingActionButton(
                    onClick = {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onNavigateToAddAddress()
                    },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .graphicsLayer {
                            scaleX = fabScale
                            scaleY = fabScale
                        }
                        .semantics {
                            contentDescription = "Add new address, navigate to address form"
                        }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = addressesState) {
                is AddressListState.Loading -> {
                    LoadingState()
                }
                
                is AddressListState.Empty -> {
                    ManageAddressesEmptyState(
                        onAddAddress = onNavigateToAddAddress
                    )
                }
                
                is AddressListState.Success -> {
                    AddressListContent(
                        addresses = state.addresses,
                        onEditAddress = onNavigateToEditAddress,
                        onDeleteAddress = { address ->
                            viewModel.deleteAddress(address)
                        },
                        onSetDefaultAddress = { addressId ->
                            viewModel.setDefaultAddress(addressId)
                        },
                        onRefresh = {
                            viewModel.refreshAddresses()
                        }
                    )
                }
                
                is AddressListState.Error -> {
                    ErrorState(
                        message = state.message,
                        onRetry = {
                            viewModel.loadAddresses()
                        }
                    )
                }
            }
            
            // Delete confirmation dialog
            addressToDelete?.let { address ->
                val currentAddresses = viewModel.getCurrentAddresses()
                val isLastAddress = currentAddresses.size == 1
                
                DeleteConfirmationDialog(
                    address = address,
                    isLastAddress = isLastAddress,
                    onConfirm = {
                        viewModel.confirmDeleteAddress()
                    },
                    onDismiss = {
                        viewModel.cancelDeleteAddress()
                    }
                )
            }
        }
    }
}

/**
 * Loading state composable
 */
@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(48.dp),
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Loading addresses...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Error state composable
 */
@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "Error Loading Addresses",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            androidx.compose.material3.Button(
                onClick = onRetry,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.semantics {
                    contentDescription = "Retry loading addresses"
                }
            ) {
                Text("Retry")
            }
        }
    }
}

/**
 * Address list content composable with staggered animations
 */
@Composable
private fun AddressListContent(
    addresses: List<Address>,
    onEditAddress: (String) -> Unit,
    onDeleteAddress: (Address) -> Unit,
    onSetDefaultAddress: (String) -> Unit,
    onRefresh: () -> Unit
) {
    val hapticFeedback = LocalHapticFeedback.current
    var isVisible by remember { mutableStateOf(false) }
    
    LaunchedEffect(addresses) {
        delay(200) // Delay for smooth entrance
        isVisible = true
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = 16.dp,
            end = 16.dp,
            top = 16.dp,
            bottom = 88.dp // Extra padding for FAB
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        itemsIndexed(
            items = addresses,
            key = { _, address -> address.id }
        ) { index, address ->
            AnimatedVisibility(
                visible = isVisible,
                enter = slideInVertically(
                    initialOffsetY = { it / 3 },
                    animationSpec = tween(300, delayMillis = index * 50)
                ) + fadeIn(animationSpec = tween(300, delayMillis = index * 50)),
                exit = slideOutVertically(
                    targetOffsetY = { it / 3 },
                    animationSpec = tween(200)
                ) + fadeOut(animationSpec = tween(200))
            ) {
                AddressCard(
                    address = address,
                    showActions = true,
                    onEdit = {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onEditAddress(address.id)
                    },
                    onDelete = {
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onDeleteAddress(address)
                    },
                    onSetDefault = if (!address.isDefault) {
                        { 
                            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                            onSetDefaultAddress(address.id) 
                        }
                    } else null
                )
            }
        }
    }
}