package com.shambit.customer.presentation.checkout.address

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.ui.components.EmptyState
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState

/**
 * Address Selection Screen
 * Allows user to select delivery address for checkout or from home screen
 * 
 * @param returnDestination The destination to return to after address selection ("home", "cart", or "checkout")
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionScreen(
    viewModel: AddressSelectionViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToAddAddress: () -> Unit = {},
    onNavigateToEditAddress: (String) -> Unit = {},
    onNavigateToManageAddresses: () -> Unit = {},
    onAddressSelected: (String) -> Unit = {},
    returnDestination: String = "checkout"
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val lifecycleOwner = LocalLifecycleOwner.current
    
    // Refresh addresses when screen becomes visible (on resume)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.loadAddresses()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
    
    // Show error snackbar
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }
    
    // Show success snackbar and navigate when address is set
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            // Check if this is from setActiveAddress
            if (message == "Address updated successfully") {
                if (returnDestination == "checkout") {
                    // In checkout flow, navigate to order summary
                    onAddressSelected(uiState.selectedAddressId ?: "")
                } else {
                    // From home/cart, navigate back immediately
                    onAddressSelected(uiState.selectedAddressId ?: "")
                }
            } else {
                // Show snackbar for other success messages (delete, set default)
                snackbarHostState.showSnackbar(message)
            }
            viewModel.clearSuccessMessage()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Select Delivery Address",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    // Show "Manage Addresses" only when not in checkout flow
                    if (returnDestination != "checkout") {
                        TextButton(onClick = onNavigateToManageAddresses) {
                            Text("Manage")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            if (!uiState.isLoading && uiState.addresses.isNotEmpty()) {
                FloatingActionButton(
                    onClick = onNavigateToAddAddress,
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Add Address"
                    )
                }
            }
        },
        bottomBar = {
            if (uiState.selectedAddressId != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Button(
                        onClick = { 
                            // Set the selected address as active (this will set it as default)
                            viewModel.setActiveAddress(uiState.selectedAddressId!!)
                        },
                        enabled = uiState.settingDefaultId == null && !uiState.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (uiState.settingDefaultId != null) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = when (returnDestination) {
                                "home" -> if (uiState.settingDefaultId != null) "Updating..." else "Use this Address"
                                "cart" -> if (uiState.settingDefaultId != null) "Updating..." else "Deliver to this Address"
                                else -> if (uiState.settingDefaultId != null) "Updating..." else "Deliver to this Address"
                            },
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    LoadingState()
                }
                uiState.error != null && uiState.addresses.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: "Failed to load addresses",
                        onRetry = { viewModel.loadAddresses() }
                    )
                }
                uiState.addresses.isEmpty() -> {
                    EmptyAddressState(onAddAddress = onNavigateToAddAddress)
                }
                else -> {
                    AddressListContent(
                        addresses = uiState.addresses,
                        selectedAddressId = uiState.selectedAddressId,
                        deletingAddressId = uiState.deletingAddressId,
                        settingDefaultId = uiState.settingDefaultId,
                        onSelectAddress = viewModel::selectAddress,
                        onEditAddress = onNavigateToEditAddress,
                        onDeleteAddress = viewModel::deleteAddress,
                        onSetDefault = viewModel::setDefaultAddress
                    )
                }
            }
        }
    }
}

/**
 * Address List Content
 */
@Composable
private fun AddressListContent(
    addresses: List<AddressDto>,
    selectedAddressId: String?,
    deletingAddressId: String?,
    settingDefaultId: String?,
    onSelectAddress: (String) -> Unit,
    onEditAddress: (String) -> Unit,
    onDeleteAddress: (String) -> Unit,
    onSetDefault: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            items = addresses,
            key = { it.id }
        ) { address ->
            AddressCard(
                address = address,
                isSelected = address.id == selectedAddressId,
                isDeleting = address.id == deletingAddressId,
                isSettingDefault = address.id == settingDefaultId,
                onSelect = { onSelectAddress(address.id) },
                onEdit = { onEditAddress(address.id) },
                onDelete = { onDeleteAddress(address.id) },
                onSetDefault = { onSetDefault(address.id) }
            )
        }
    }
}

/**
 * Address Card
 */
@Composable
private fun AddressCard(
    address: AddressDto,
    isSelected: Boolean,
    isDeleting: Boolean,
    isSettingDefault: Boolean,
    onSelect: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSetDefault: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .then(
                if (isSelected) {
                    Modifier.border(
                        width = 2.dp,
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(12.dp)
                    )
                } else {
                    Modifier
                }
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    // Radio button
                    RadioButton(
                        selected = isSelected,
                        onClick = onSelect
                    )
                    
                    // Address details
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Address type with icon
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = getAddressTypeIcon(address.type ?: "other"),
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = (address.type ?: "other").replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() },
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            
                            if (address.isDefault) {
                                Box(
                                    modifier = Modifier
                                        .background(
                                            color = MaterialTheme.colorScheme.primary,
                                            shape = RoundedCornerShape(4.dp)
                                        )
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "Default",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onPrimary
                                    )
                                }
                            }
                        }
                        
                        // Address lines
                        Text(
                            text = address.addressLine1 ?: "",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        
                        if (!address.addressLine2.isNullOrBlank()) {
                            Text(
                                text = address.addressLine2,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        
                        if (!address.landmark.isNullOrBlank()) {
                            Text(
                                text = "Landmark: ${address.landmark}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        
                        // City, State, Pincode
                        Text(
                            text = "${address.city}, ${address.state} - ${address.pincode}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Edit button
                TextButton(
                    onClick = {
                        onEdit()
                    },
                    enabled = !isDeleting && !isSettingDefault,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Edit")
                }
                
                // Delete button
                TextButton(
                    onClick = {
                        onDelete()
                    },
                    enabled = !isDeleting && !isSettingDefault,
                    modifier = Modifier.weight(1f)
                ) {
                    if (isDeleting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Delete")
                    }
                }
                
                // Set default button
                if (!address.isDefault) {
                    TextButton(
                        onClick = {
                            onSetDefault()
                        },
                        enabled = !isDeleting && !isSettingDefault,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (isSettingDefault) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Set Default")
                        }
                    }
                }
            }
        }
    }
}

/**
 * Empty Address State
 */
@Composable
private fun EmptyAddressState(
    onAddAddress: () -> Unit
) {
    EmptyState(
        icon = Icons.Default.LocationOn,
        title = "No Addresses",
        message = "Add a delivery address to continue with your order",
        actionText = "Add Address",
        onAction = onAddAddress
    )
}

/**
 * Get icon for address type
 */
private fun getAddressTypeIcon(type: String): ImageVector {
    return when (type.lowercase()) {
        "home" -> Icons.Filled.Home
        "work" -> Icons.Filled.LocationOn
        else -> Icons.Filled.Place
    }
}
