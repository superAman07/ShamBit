package com.shambit.customer.presentation.address

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.R
import com.shambit.customer.domain.manager.AddressStateManager
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.usecase.DeleteAddressUseCase
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.SetDefaultAddressUseCase
import com.shambit.customer.ui.components.AddressToastMessages
import com.shambit.customer.ui.components.LoadingOperations
import com.shambit.customer.util.AppError
import com.shambit.customer.util.ErrorHandler
import com.shambit.customer.util.ErrorStateManager
import com.shambit.customer.util.LoadingState
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.OptimisticUpdateManager
import com.shambit.customer.util.ToastMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Address list state for Manage Address screen
 * 
 * Represents different states of the address list:
 * - Loading: Initial load or refresh in progress
 * - Success: Addresses loaded successfully
 * - Error: Failed to load addresses
 * - Empty: No addresses available
 */
sealed class AddressListState {
    object Loading : AddressListState()
    data class Success(val addresses: List<Address>) : AddressListState()
    data class Error(val message: String) : AddressListState()
    object Empty : AddressListState()
}

/**
 * Operation state for address operations feedback
 * 
 * Represents the state of address operations (save, delete, set default):
 * - Idle: No operation in progress
 * - Loading: Operation in progress
 * - Success: Operation completed successfully with message
 * - Error: Operation failed with error message
 */
sealed class OperationState {
    object Idle : OperationState()
    object Loading : OperationState()
    data class Success(val message: String) : OperationState()
    data class Error(val message: String) : OperationState()
}

/**
 * ViewModel for Manage Address screen
 * 
 * Manages address list state and operations including:
 * - Loading and displaying addresses
 * - Setting default address with single default invariant
 * - Deleting addresses with confirmation state
 * - Refreshing address list
 * 
 * Requirements: 3.1, 3.2, 3.3, 4.1, 6.1, 6.3, 6.5
 */
@HiltViewModel
class AddressViewModel @Inject constructor(
    private val getAddressesUseCase: GetAddressesUseCase,
    private val setDefaultAddressUseCase: SetDefaultAddressUseCase,
    private val deleteAddressUseCase: DeleteAddressUseCase,
    private val addressStateManager: AddressStateManager,
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val _addressesState = MutableStateFlow<AddressListState>(AddressListState.Loading)
    val addressesState: StateFlow<AddressListState> = _addressesState.asStateFlow()
    
    private val _operationState = MutableStateFlow<OperationState>(OperationState.Idle)
    val operationState: StateFlow<OperationState> = _operationState.asStateFlow()
    
    // Track address pending deletion for confirmation dialog
    private val _addressToDelete = MutableStateFlow<Address?>(null)
    val addressToDelete: StateFlow<Address?> = _addressToDelete.asStateFlow()
    
    // Enhanced error handling and loading states
    private val errorStateManager = ErrorStateManager()
    val errorState = errorStateManager.errorState
    val loadingState = errorStateManager.loadingState
    val toastMessage = errorStateManager.toastMessage
    
    // Optimistic update manager for better UX
    private val optimisticUpdateManager = OptimisticUpdateManager()
    
    init {
        loadAddresses()
        observeSharedAddressState()
    }
    
    /**
     * Observe shared address state for cross-screen synchronization
     * 
     * Listens to address changes from AddressStateManager and updates local state.
     * Ensures immediate updates when addresses change from other screens.
     * 
     * Requirements: 4.4, 10.4
     */
    private fun observeSharedAddressState() {
        viewModelScope.launch {
            addressStateManager.addresses.collect { addresses ->
                if (addresses.isEmpty()) {
                    _addressesState.update { AddressListState.Empty }
                } else {
                    _addressesState.update { AddressListState.Success(addresses) }
                }
            }
        }
    }

    /**
     * Load addresses from repository with enhanced error handling
     * 
     * Uses AddressStateManager to refresh addresses and propagate changes.
     * Updates addressesState based on result with proper error handling.
     * 
     * Requirements: 6.1, 6.5, 4.4, 10.4, 3.5, 11.3
     */
    fun loadAddresses() {
        viewModelScope.launch {
            errorStateManager.setLoading(true, LoadingOperations.LOADING_ADDRESSES)
            _addressesState.update { AddressListState.Loading }
            
            when (val result = addressStateManager.refreshAddresses()) {
                is NetworkResult.Success -> {
                    errorStateManager.setLoading(false)
                    errorStateManager.clearError()
                    // State is automatically updated via observeSharedAddressState()
                }
                is NetworkResult.Error -> {
                    errorStateManager.setLoading(false)
                    val appError = ErrorHandler.handleNetworkError(result.message, context)
                    errorStateManager.setError(appError)
                    
                    _addressesState.update { 
                        AddressListState.Error(ErrorHandler.getErrorMessage(appError, context)) 
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Set an address as default with optimistic updates and enhanced error handling
     * 
     * Uses SetDefaultAddressUseCase which ensures single default invariant.
     * Updates shared state for cross-screen synchronization.
     * Shows operation feedback via operationState and toast notifications.
     * 
     * Requirements: 4.1, 6.3, 4.4, 10.4, 3.5, 11.3
     */
    fun setDefaultAddress(id: String) {
        viewModelScope.launch {
            errorStateManager.setLoading(true, LoadingOperations.SETTING_DEFAULT)
            _operationState.update { OperationState.Loading }
            
            // Apply optimistic update
            val operationId = optimisticUpdateManager.optimisticallySetDefaultAddress(id)
            addressStateManager.setDefaultAddress(id)
            
            when (val result = setDefaultAddressUseCase(id)) {
                is NetworkResult.Success -> {
                    errorStateManager.setLoading(false)
                    errorStateManager.clearError()
                    
                    _operationState.update { 
                        OperationState.Success(AddressToastMessages.DEFAULT_SET) 
                    }
                    
                    // Show success toast
                    errorStateManager.showToast(
                        ErrorHandler.createSuccessToast(AddressToastMessages.DEFAULT_SET)
                    )
                    
                    // Confirm optimistic update
                    operationId?.let { optimisticUpdateManager.confirmOperation(it) }
                    
                    // Clear operation state after delay
                    kotlinx.coroutines.delay(2000)
                    _operationState.update { OperationState.Idle }
                }
                is NetworkResult.Error -> {
                    errorStateManager.setLoading(false)
                    val appError = ErrorHandler.handleNetworkError(result.message, context)
                    errorStateManager.setError(appError)
                    
                    val errorMessage = ErrorHandler.getErrorMessage(appError, context)
                    _operationState.update { 
                        OperationState.Error(errorMessage) 
                    }
                    
                    // Show error toast with retry option
                    errorStateManager.showToast(
                        ErrorHandler.createErrorToast(
                            message = errorMessage,
                            canRetry = appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            },
                            onRetry = if (appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            }) { { setDefaultAddress(id) } } else null
                        )
                    )
                    
                    // Rollback optimistic update
                    operationId?.let { optimisticUpdateManager.rollbackOperation(it, errorMessage) }
                    
                    // Clear operation state after delay
                    kotlinx.coroutines.delay(3000)
                    _operationState.update { OperationState.Idle }
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Initiate address deletion with confirmation
     * 
     * Sets the address to delete, which triggers confirmation dialog display.
     * The actual deletion happens in confirmDeleteAddress().
     * 
     * Requirements: 3.1
     */
    fun deleteAddress(address: Address) {
        _addressToDelete.update { address }
    }
    
    /**
     * Confirm and execute address deletion with enhanced edge case handling and optimistic updates
     * 
     * Uses DeleteAddressUseCase which handles:
     * - Default address deletion (auto-select new default)
     * - Last address deletion (enter no address state)
     * - Cache updates
     * 
     * Enhanced with edge case handling:
     * - Delete operation rollback on failure
     * - Proper error recovery with UI restoration
     * - Concurrent modification handling
     * - Optimistic updates with rollback capability
     * 
     * Updates shared state for cross-screen synchronization.
     * Shows operation feedback with toast notifications.
     * 
     * Requirements: 3.2, 3.3, 3.5, 6.3, 4.4, 10.4, 11.1, 11.2, 11.3, 11.4
     */
    fun confirmDeleteAddress() {
        val addressToDelete = _addressToDelete.value ?: return
        
        viewModelScope.launch {
            errorStateManager.setLoading(true, LoadingOperations.DELETING_ADDRESS)
            _operationState.update { OperationState.Loading }
            _addressToDelete.update { null } // Clear confirmation state
            
            // Store current state for potential rollback
            val wasSelected = addressStateManager.getCurrentSelectedCheckoutAddress()?.id == addressToDelete.id
            val wasDefault = addressToDelete.isDefault
            
            // Apply optimistic update
            val operationId = optimisticUpdateManager.optimisticallyDeleteAddress(
                addressId = addressToDelete.id,
                wasSelected = wasSelected,
                wasDefault = wasDefault
            )
            
            // Optimistically update shared state for immediate UI feedback
            addressStateManager.removeAddress(addressToDelete.id)
            
            when (val result = deleteAddressUseCase(addressToDelete.id)) {
                is NetworkResult.Success -> {
                    errorStateManager.setLoading(false)
                    errorStateManager.clearError()
                    
                    _operationState.update { 
                        OperationState.Success(AddressToastMessages.ADDRESS_DELETED) 
                    }
                    
                    // Show success toast
                    errorStateManager.showToast(
                        ErrorHandler.createSuccessToast(AddressToastMessages.ADDRESS_DELETED)
                    )
                    
                    // Confirm optimistic update
                    operationId?.let { optimisticUpdateManager.confirmOperation(it) }
                    
                    // Clear operation state after delay
                    kotlinx.coroutines.delay(2000)
                    _operationState.update { OperationState.Idle }
                }
                is NetworkResult.Error -> {
                    errorStateManager.setLoading(false)
                    val appError = ErrorHandler.handleNetworkError(result.message, context)
                    errorStateManager.setError(appError)
                    
                    // Edge case: Delete operation failed - rollback UI state
                    addressStateManager.rollbackAddressRemoval(addressToDelete, wasSelected)
                    
                    val errorMessage = ErrorHandler.getErrorMessage(appError, context)
                    _operationState.update { 
                        OperationState.Error(errorMessage) 
                    }
                    
                    // Show error toast with retry option
                    errorStateManager.showToast(
                        ErrorHandler.createErrorToast(
                            message = errorMessage,
                            canRetry = appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            },
                            onRetry = if (appError.let { 
                                it is AppError.NetworkError && it.isRetryable ||
                                it is AppError.UnknownError && it.isRetryable
                            }) { { 
                                _addressToDelete.update { addressToDelete }
                                confirmDeleteAddress() 
                            } } else null
                        )
                    )
                    
                    // Rollback optimistic update
                    operationId?.let { optimisticUpdateManager.rollbackOperation(it, errorMessage) }
                    
                    // Clear operation state after delay
                    kotlinx.coroutines.delay(3000)
                    _operationState.update { OperationState.Idle }
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Cancel address deletion
     * 
     * Clears the address to delete, hiding the confirmation dialog.
     */
    fun cancelDeleteAddress() {
        _addressToDelete.update { null }
    }
    
    /**
     * Refresh addresses with force refresh and concurrent modification handling
     * 
     * Forces a fresh fetch from the network through AddressStateManager.
     * Used for pull-to-refresh and after operations.
     * Propagates changes to all observing ViewModels.
     * Enhanced to handle concurrent modifications.
     * 
     * Requirements: 6.5, 4.4, 10.4, 11.4
     */
    fun refreshAddresses() {
        viewModelScope.launch {
            _addressesState.update { AddressListState.Loading }
            
            // Check for state consistency before refresh
            if (!addressStateManager.validateStateConsistency()) {
                // Handle concurrent modification detected
                when (val result = addressStateManager.handleConcurrentModification()) {
                    is NetworkResult.Success -> {
                        // State is automatically updated via observeSharedAddressState()
                    }
                    is NetworkResult.Error -> {
                        _addressesState.update { 
                            AddressListState.Error("Data conflict detected: ${result.message}") 
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            } else {
                // Normal refresh
                when (val result = addressStateManager.refreshAddresses()) {
                    is NetworkResult.Success -> {
                        // State is automatically updated via observeSharedAddressState()
                    }
                    is NetworkResult.Error -> {
                        _addressesState.update { 
                            AddressListState.Error(result.message) 
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            }
        }
    }
    
    /**
     * Clear operation state
     * 
     * Manually clears operation feedback state.
     */
    fun clearOperationState() {
        _operationState.update { OperationState.Idle }
    }
    
    /**
     * Get current addresses list
     * 
     * Returns the current list of addresses if in Success state, empty list otherwise.
     */
    fun getCurrentAddresses(): List<Address> {
        return when (val state = _addressesState.value) {
            is AddressListState.Success -> state.addresses
            else -> emptyList()
        }
    }
    
    /**
     * Check if address list is empty
     */
    fun isAddressListEmpty(): Boolean {
        return _addressesState.value is AddressListState.Empty
    }
    
    /**
     * Check if addresses are loading
     */
    fun isLoading(): Boolean {
        return _addressesState.value is AddressListState.Loading
    }
    
    /**
     * Check if there's an error
     */
    fun hasError(): Boolean {
        return _addressesState.value is AddressListState.Error
    }
    
    /**
     * Get error message if any
     */
    fun getErrorMessage(): String? {
        return when (val state = _addressesState.value) {
            is AddressListState.Error -> state.message
            else -> null
        }
    }
    
    /**
     * Retry failed operation with enhanced error handling
     * 
     * Attempts to retry the last failed operation based on current error state.
     * Provides intelligent retry logic with exponential backoff.
     * 
     * Requirements: 3.5, 7.6, 11.3
     */
    fun retryFailedOperation() {
        if (errorStateManager.canRetry()) {
            errorStateManager.startRetry()
            
            viewModelScope.launch {
                try {
                    // Determine what operation to retry based on current state
                    when {
                        hasError() -> {
                            // Retry loading addresses
                            loadAddresses()
                        }
                        else -> {
                            // Default to refreshing addresses
                            refreshAddresses()
                        }
                    }
                    
                    errorStateManager.completeRetry()
                } catch (e: Exception) {
                    val appError = ErrorHandler.handleNetworkError(e.message ?: "Retry failed", context)
                    errorStateManager.failRetry(appError)
                }
            }
        }
    }
    
    /**
     * Clear all error and toast states
     * 
     * Provides a clean slate for the UI by clearing all error states.
     */
    fun clearAllErrors() {
        errorStateManager.clearError()
        errorStateManager.clearToast()
    }
    
    /**
     * Clear toast message
     * 
     * Called by UI when toast is shown to clear the message state.
     */
    fun clearToast() {
        errorStateManager.clearToast()
    }
    
    /**
     * Check if there are pending optimistic operations
     * 
     * Used by UI to show pending operation indicators.
     */
    fun hasPendingOperations(): Boolean {
        return optimisticUpdateManager.hasPendingOperations()
    }
    
    /**
     * Get pending operations count
     * 
     * Used by UI to show operation count badges.
     */
    fun getPendingOperationsCount(): Int {
        return optimisticUpdateManager.getPendingOperationsCount()
    }
    
    /**
     * Force sync with server state
     * 
     * Clears all optimistic updates and syncs with authoritative server state.
     * Used when data conflicts are detected.
     * 
     * Requirements: 11.4
     */
    fun forceSyncWithServer() {
        viewModelScope.launch {
            errorStateManager.setLoading(true, LoadingOperations.SYNCING_CHANGES)
            
            when (val result = addressStateManager.refreshAddresses()) {
                is NetworkResult.Success -> {
                    // Sync optimistic manager with server state
                    optimisticUpdateManager.syncWithAuthoritativeState(result.data)
                    
                    errorStateManager.setLoading(false)
                    errorStateManager.clearError()
                    
                    // Show sync success message
                    errorStateManager.showToast(
                        ErrorHandler.createSuccessToast("Data synchronized successfully")
                    )
                }
                is NetworkResult.Error -> {
                    errorStateManager.setLoading(false)
                    val appError = ErrorHandler.handleNetworkError(result.message, context)
                    errorStateManager.setError(appError)
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
}