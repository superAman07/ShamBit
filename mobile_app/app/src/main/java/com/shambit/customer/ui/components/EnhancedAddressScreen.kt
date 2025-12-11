package com.shambit.customer.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.shambit.customer.presentation.address.AddressListState
import com.shambit.customer.presentation.address.AddressViewModel
import com.shambit.customer.presentation.address.OperationState
import com.shambit.customer.util.ErrorState
import com.shambit.customer.util.LoadingState

/**
 * Example of enhanced address screen with comprehensive error handling
 * 
 * Demonstrates how to use the new error handling and loading state components
 * for better user experience in address management screens.
 * 
 * Requirements: 3.5, 7.6, 11.3
 */
@Composable
fun EnhancedAddressScreen(
    viewModel: AddressViewModel,
    modifier: Modifier = Modifier
) {
    // Collect all state flows
    val addressesState by viewModel.addressesState.collectAsState()
    val operationState by viewModel.operationState.collectAsState()
    val errorState by viewModel.errorState.collectAsState()
    val loadingState by viewModel.loadingState.collectAsState()
    val toastMessage by viewModel.toastMessage.collectAsState()
    
    // Handle toast messages
    LaunchedEffect(toastMessage) {
        toastMessage?.let {
            // Toast will be handled by EnhancedSnackbarHost
            viewModel.clearToast()
        }
    }
    
    Scaffold(
        snackbarHost = {
            EnhancedSnackbarHost(
                toastMessageFlow = viewModel.toastMessage,
                onToastShown = { viewModel.clearToast() }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                // Show full screen loading for initial load
                addressesState is AddressListState.Loading && !loadingState.isLoading -> {
                    FullScreenLoading(
                        loadingState = LoadingState(
                            isLoading = true,
                            operation = LoadingOperations.LOADING_ADDRESSES
                        )
                    )
                }
                
                // Show full screen error for critical failures
                addressesState is AddressListState.Error && errorState.error != null -> {
                    FullScreenError(
                        errorState = errorState,
                        onRetry = { viewModel.retryFailedOperation() },
                        onDismiss = { viewModel.clearAllErrors() }
                    )
                }
                
                // Show empty state for no addresses
                addressesState is AddressListState.Empty -> {
                    EmptyStateError(
                        title = "No Addresses Found",
                        message = "Add your first delivery address to get started",
                        actionLabel = "Add Address",
                        onAction = { /* Navigate to add address */ }
                    )
                }
                
                // Show address list with inline error handling
                else -> {
                    val successState = addressesState as? AddressListState.Success
                    if (successState != null) {
                        Column {
                            // Show inline error for non-critical failures
                            if (errorState.error != null) {
                                InlineError(
                                    errorState = errorState,
                                    onRetry = { viewModel.retryFailedOperation() }
                                )
                            }
                            
                            // Show inline loading for operations
                            if (loadingState.isLoading) {
                                InlineLoading(loadingState = loadingState)
                            }
                            
                            // Address list content would go here
                            AddressListContent(
                                addresses = successState.addresses,
                                operationState = operationState,
                                onSetDefault = { addressId -> viewModel.setDefaultAddress(addressId) },
                                onDelete = { address -> viewModel.deleteAddress(address) }
                            )
                        }
                    }
                }
            }
            
            // Show overlay loading for blocking operations
            OverlayLoading(
                isVisible = operationState is OperationState.Loading,
                loadingState = LoadingState(
                    isLoading = true,
                    operation = when (operationState) {
                        is OperationState.Loading -> "Processing..."
                        else -> null
                    }
                )
            )
        }
    }
}

/**
 * Address list content component
 */
@Composable
private fun AddressListContent(
    addresses: List<com.shambit.customer.domain.model.Address>,
    operationState: OperationState,
    onSetDefault: (String) -> Unit,
    onDelete: (com.shambit.customer.domain.model.Address) -> Unit,
    modifier: Modifier = Modifier
) {
    // Address list implementation would go here
    // This is just a placeholder to show the structure
    Column(modifier = modifier) {
        addresses.forEach { address ->
            AddressCard(
                address = address,
                showActions = true,
                onEdit = { /* Handle edit */ },
                onDelete = { onDelete(address) },
                onSetDefault = { onSetDefault(address.id) }
            )
        }
    }
}

/**
 * Example of enhanced form screen with validation and error handling
 */
@Composable
fun EnhancedAddressFormScreen(
    viewModel: com.shambit.customer.presentation.address.AddAddressViewModel,
    modifier: Modifier = Modifier
) {
    val formState by viewModel.formState.collectAsState()
    val saveState by viewModel.saveState.collectAsState()
    val validationErrors by viewModel.validationErrors.collectAsState()
    val errorState by viewModel.errorState.collectAsState()
    val loadingState by viewModel.loadingState.collectAsState()
    
    Scaffold(
        snackbarHost = {
            EnhancedSnackbarHost(
                toastMessageFlow = viewModel.toastMessage,
                onToastShown = { viewModel.clearToast() }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Show inline error for form-level errors
            if (errorState.error != null) {
                InlineError(
                    errorState = errorState,
                    onRetry = { viewModel.retrySave() }
                )
            }
            
            // Address form placeholder - would need actual implementation
            // AddressForm component would be implemented separately
            
            // Save button with loading state
            androidx.compose.material3.Button(
                onClick = { viewModel.saveAddress() },
                enabled = saveState !is com.shambit.customer.presentation.address.SaveState.Loading,
                modifier = Modifier.padding(16.dp)
            ) {
                ButtonLoading(
                    isLoading = saveState is com.shambit.customer.presentation.address.SaveState.Loading,
                    text = if (formState.isEditMode) "Update Address" else "Save Address",
                    loadingText = if (formState.isEditMode) "Updating..." else "Saving..."
                )
            }
        }
    }
}