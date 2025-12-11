package com.shambit.customer.presentation.checkout

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.CartDto
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.domain.manager.AddressStateManager
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.GetCheckoutAddressUseCase
import com.shambit.customer.domain.usecase.LockCheckoutAddressUseCase
import com.shambit.customer.domain.usecase.SelectCheckoutAddressUseCase
import com.shambit.customer.ui.components.LoadingOperations
import com.shambit.customer.util.AppError
import com.shambit.customer.util.ErrorHandler
import com.shambit.customer.util.ErrorStateManager
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Checkout state data class
 * 
 * Represents the overall state of the checkout process:
 * - hasAddress: Whether user has any addresses available
 * - isAddressLocked: Whether address is locked for payment
 * - canProceedToPayment: Whether user can proceed to payment
 * - totalAmount: Total amount for the order
 */
data class CheckoutState(
    val hasAddress: Boolean = false,
    val isAddressLocked: Boolean = false,
    val canProceedToPayment: Boolean = false,
    val totalAmount: Double = 0.0
)

/**
 * Address lock state sealed class
 * 
 * Represents different states of address locking:
 * - Unlocked: Address is not locked, can be changed
 * - Locking: Address lock operation in progress
 * - Locked: Address is locked with the locked address data
 * - LockFailed: Address lock operation failed with error message
 */
sealed class AddressLockState {
    object Unlocked : AddressLockState()
    object Locking : AddressLockState()
    data class Locked(val address: Address) : AddressLockState()
    data class LockFailed(val error: String) : AddressLockState()
}

/**
 * ViewModel for Checkout screen with address management
 * 
 * Manages checkout flow including:
 * - Loading default address and cart data
 * - Address selection during checkout
 * - Address locking before payment
 * - Cart preservation during address operations
 * - No address state handling
 * 
 * Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 9.1
 */
@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val getAddressesUseCase: GetAddressesUseCase,
    private val getCheckoutAddressUseCase: GetCheckoutAddressUseCase,
    private val selectCheckoutAddressUseCase: SelectCheckoutAddressUseCase,
    private val lockCheckoutAddressUseCase: LockCheckoutAddressUseCase,
    private val cartRepository: CartRepository,
    private val addressStateManager: AddressStateManager,
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    // Use shared state for cross-screen synchronization
    val selectedAddress: StateFlow<Address?> = addressStateManager.selectedCheckoutAddress
    val addresses: StateFlow<List<Address>> = addressStateManager.addresses
    
    private val _cartItems = MutableStateFlow<CartDto?>(null)
    val cartItems: StateFlow<CartDto?> = _cartItems.asStateFlow()
    
    private val _addressLockState = MutableStateFlow<AddressLockState>(AddressLockState.Unlocked)
    val addressLockState: StateFlow<AddressLockState> = _addressLockState.asStateFlow()
    
    private val _checkoutState = MutableStateFlow(CheckoutState())
    val checkoutState: StateFlow<CheckoutState> = _checkoutState.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    // Enhanced error handling and loading states
    private val errorStateManager = ErrorStateManager()
    val errorState = errorStateManager.errorState
    val loadingState = errorStateManager.loadingState
    val toastMessage = errorStateManager.toastMessage
    
    init {
        loadCheckoutData()
        observeSharedAddressState()
    }
    
    /**
     * Observe shared address state for cross-screen synchronization with edge case handling
     * 
     * Listens to address changes from AddressStateManager and updates checkout state.
     * Ensures immediate updates when addresses change from other screens.
     * Enhanced to handle edge cases:
     * - Selected address deletion (automatic switch to default)
     * - Last address deletion (enter no address state)
     * - Address lock state management during deletions
     * 
     * Requirements: 4.4, 10.4, 11.1, 11.2
     */
    private fun observeSharedAddressState() {
        viewModelScope.launch {
            // Observe selected address changes
            selectedAddress.collect { address ->
                val currentCart = _cartItems.value
                val hasAddresses = addressStateManager.getCurrentAddresses().isNotEmpty()
                
                _checkoutState.update { currentState ->
                    currentState.copy(
                        hasAddress = hasAddresses,
                        canProceedToPayment = address != null && currentCart?.items?.isNotEmpty() == true && !currentState.isAddressLocked,
                        totalAmount = currentCart?.totalAmount ?: currentState.totalAmount
                    )
                }
                
                // Edge case: If no address is selected but addresses exist, handle gracefully
                if (address == null && hasAddresses) {
                    // This can happen if selected address was deleted
                    val defaultAddress = addressStateManager.getCurrentDefaultAddress()
                    if (defaultAddress != null) {
                        // Automatically select the default address
                        addressStateManager.selectCheckoutAddress(defaultAddress.id)
                    }
                }
                
                // Edge case: If address is locked but selected address changed, unlock
                if (_addressLockState.value is AddressLockState.Locked && address == null) {
                    resetAddressLock()
                }
            }
        }
        
        // Observe address list changes for no address state handling
        viewModelScope.launch {
            addresses.collect { addressList ->
                if (addressList.isEmpty()) {
                    // Edge case: Last address deleted - enter no address state
                    handleNoAddressState()
                } else if (_checkoutState.value.hasAddress != true) {
                    // Edge case: Address added after no address state - restore functionality
                    handleAddressAdded()
                }
            }
        }
    }

    /**
     * Load checkout data including default address and cart with enhanced error handling
     * 
     * Loads addresses through shared state manager and current cart items.
     * Updates checkout state based on address availability.
     * Preserves cart items during address operations.
     * Enhanced with proper API failure handling and UI restoration.
     * 
     * Requirements: 7.1, 8.1, 9.1, 4.4, 10.4, 11.3
     */
    fun loadCheckoutData() {
        viewModelScope.launch {
            _isLoading.update { true }
            _error.update { null }
            
            // Store current state for potential restoration on failure
            val previousCheckoutState = _checkoutState.value
            val previousCartItems = _cartItems.value
            
            try {
                // Load addresses through shared state manager
                when (val addressesResult = addressStateManager.refreshAddresses()) {
                    is NetworkResult.Success -> {
                        // Addresses are automatically updated via shared state
                    }
                    is NetworkResult.Error -> {
                        // Edge case: API failure - show error but maintain previous state
                        _error.update { "Failed to load addresses: ${addressesResult.message}" }
                        
                        // Check if we have cached addresses to fall back to
                        if (addressStateManager.getCurrentAddresses().isEmpty()) {
                            _checkoutState.update { currentState ->
                                currentState.copy(
                                    hasAddress = false,
                                    canProceedToPayment = false
                                )
                            }
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Handle loading state if needed
                    }
                }
                
                // Load cart data
                when (val cartResult = cartRepository.getCart()) {
                    is NetworkResult.Success -> {
                        _cartItems.update { cartResult.data }
                        
                        // Checkout state is automatically updated via observeSharedAddressState()
                    }
                    is NetworkResult.Error -> {
                        // Edge case: Cart API failure - restore previous cart state if available
                        if (previousCartItems != null) {
                            _cartItems.update { previousCartItems }
                            _error.update { "Failed to refresh cart: ${cartResult.message}" }
                        } else {
                            _error.update { "Failed to load cart: ${cartResult.message}" }
                            _checkoutState.update { currentState ->
                                currentState.copy(
                                    canProceedToPayment = false,
                                    totalAmount = 0.0
                                )
                            }
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Handle loading state if needed
                    }
                }
            } catch (e: Exception) {
                // Edge case: Unexpected error - restore previous state and show error
                _error.update { "Unexpected error occurred: ${e.message}" }
                _checkoutState.update { previousCheckoutState }
                _cartItems.update { previousCartItems }
            } finally {
                _isLoading.update { false }
            }
        }
    }
    
    /**
     * Select an address for checkout
     * 
     * Updates the selected address through shared state manager for cross-screen sync.
     * Validates that the address exists and updates checkout state accordingly.
     * 
     * Requirements: 5.3, 7.3, 9.1, 4.4, 10.4
     */
    fun selectAddress(address: Address) {
        viewModelScope.launch {
            _error.update { null }
            
            // Update shared state immediately for cross-screen synchronization
            addressStateManager.selectCheckoutAddress(address.id)
            
            when (val result = selectCheckoutAddressUseCase(address.id)) {
                is NetworkResult.Success -> {
                    // State is automatically updated via observeSharedAddressState()
                }
                is NetworkResult.Error -> {
                    _error.update { result.message }
                }
                is NetworkResult.Loading -> {
                    // Handle loading state if needed
                }
            }
        }
    }
    
    /**
     * Proceed to payment with address locking
     * 
     * Locks the selected address and prepares for payment navigation.
     * Prevents address changes once payment process begins.
     * Handles lock failures with proper error messaging.
     * 
     * Requirements: 7.4, 7.6
     */
    fun proceedToPayment() {
        val address = selectedAddress.value
        if (address == null) {
            _error.update { "Please select a delivery address" }
            return
        }
        
        val cart = _cartItems.value
        if (cart == null || cart.items.isEmpty()) {
            _error.update { "Your cart is empty" }
            return
        }
        
        lockAddress()
    }
    
    /**
     * Lock address for payment with enhanced error handling
     * 
     * Internal method to handle address locking with proper state management.
     * Updates address lock state and handles failures appropriately.
     * Enhanced with retry mechanism and proper error recovery.
     * 
     * Requirements: 7.4, 7.6, 11.3
     */
    private fun lockAddress() {
        val address = selectedAddress.value ?: return
        
        viewModelScope.launch {
            _addressLockState.update { AddressLockState.Locking }
            _error.update { null }
            
            // Store current state for potential recovery
            val previousCheckoutState = _checkoutState.value
            
            try {
                when (val result = lockCheckoutAddressUseCase(address)) {
                    is NetworkResult.Success -> {
                        _addressLockState.update { AddressLockState.Locked(result.data) }
                        _checkoutState.update { currentState ->
                            currentState.copy(isAddressLocked = true)
                        }
                    }
                    is NetworkResult.Error -> {
                        // Edge case: Address lock failure - restore previous state
                        _addressLockState.update { AddressLockState.LockFailed(result.message) }
                        _checkoutState.update { previousCheckoutState }
                        
                        // Provide user-friendly error message with retry option
                        val errorMessage = when {
                            result.message.contains("network", ignoreCase = true) -> 
                                "Network error. Please check your connection and try again."
                            result.message.contains("timeout", ignoreCase = true) -> 
                                "Request timed out. Please try again."
                            result.message.contains("address", ignoreCase = true) -> 
                                "Address validation failed. Please select a different address."
                            else -> "Unable to proceed to payment. Please try again."
                        }
                        
                        _error.update { errorMessage }
                    }
                    is NetworkResult.Loading -> {
                        // Already in locking state
                    }
                }
            } catch (e: Exception) {
                // Edge case: Unexpected error during lock - restore state
                _addressLockState.update { AddressLockState.LockFailed("Unexpected error: ${e.message}") }
                _checkoutState.update { previousCheckoutState }
                _error.update { "An unexpected error occurred. Please try again." }
            }
        }
    }
    
    /**
     * Retry address lock operation with enhanced error handling
     * 
     * Retries the address lock operation after a failure.
     * Provides users with a way to recover from temporary failures.
     * Uses enhanced error state management for better UX.
     * 
     * Requirements: 7.6, 11.3
     */
    fun retryAddressLock() {
        if (_addressLockState.value is AddressLockState.LockFailed) {
            errorStateManager.startRetry()
            _error.update { null }
            
            viewModelScope.launch {
                try {
                    lockAddress()
                    errorStateManager.completeRetry()
                } catch (e: Exception) {
                    val appError = ErrorHandler.handleNetworkError(e.message ?: "Retry failed", context)
                    errorStateManager.failRetry(appError)
                }
            }
        }
    }
    
    /**
     * Retry failed operation based on current error state
     * 
     * Intelligently retries the appropriate operation based on current state.
     * 
     * Requirements: 3.5, 7.6, 11.3
     */
    fun retryFailedOperation() {
        if (errorStateManager.canRetry()) {
            errorStateManager.startRetry()
            
            viewModelScope.launch {
                try {
                    when {
                        _addressLockState.value is AddressLockState.LockFailed -> {
                            lockAddress()
                        }
                        else -> {
                            loadCheckoutData()
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
     * Clear all error states
     */
    fun clearAllErrors() {
        errorStateManager.clearError()
        errorStateManager.clearToast()
        _error.update { null }
    }
    
    /**
     * Clear toast message
     */
    fun clearToast() {
        errorStateManager.clearToast()
    }
    
    /**
     * Check if user has addresses
     * 
     * Convenience method to check address availability for UI state management.
     * 
     * Requirements: 8.1, 8.2
     */
    fun hasAddresses(): Boolean {
        return _checkoutState.value.hasAddress
    }
    
    /**
     * Check if address is locked
     * 
     * Convenience method to check if address is locked for payment.
     * 
     * Requirements: 7.5
     */
    fun isAddressLocked(): Boolean {
        return _addressLockState.value is AddressLockState.Locked
    }
    
    /**
     * Get current cart total
     * 
     * Returns the current cart total amount.
     */
    fun getCartTotal(): Double {
        return _cartItems.value?.totalAmount ?: 0.0
    }
    
    /**
     * Get cart item count
     * 
     * Returns the number of items in the cart.
     */
    fun getCartItemCount(): Int {
        return _cartItems.value?.itemCount ?: 0
    }
    
    /**
     * Refresh checkout data
     * 
     * Forces a refresh of both address and cart data.
     * Useful for pull-to-refresh or after returning from address management.
     */
    fun refreshCheckoutData() {
        loadCheckoutData()
    }
    
    /**
     * Clear error state
     * 
     * Clears any error messages.
     */
    fun clearError() {
        _error.update { null }
    }
    
    /**
     * Reset address lock state
     * 
     * Resets address lock state to unlocked.
     * Used when returning from payment or on payment cancellation.
     */
    fun resetAddressLock() {
        _addressLockState.update { AddressLockState.Unlocked }
        _checkoutState.update { currentState ->
            currentState.copy(isAddressLocked = false)
        }
    }
    
    /**
     * Handle no address state
     * 
     * Updates state when user has no addresses.
     * Disables payment progression and shows appropriate UI.
     * 
     * Requirements: 8.1, 8.2
     */
    fun handleNoAddressState() {
        _checkoutState.update { currentState ->
            currentState.copy(
                hasAddress = false,
                canProceedToPayment = false,
                isAddressLocked = false
            )
        }
        _addressLockState.update { AddressLockState.Unlocked }
    }
    
    /**
     * Handle address added
     * 
     * Called when user adds their first address.
     * Restores normal checkout functionality.
     * 
     * Requirements: 8.3, 8.5
     */
    fun handleAddressAdded() {
        // Reload checkout data to get the new address
        loadCheckoutData()
    }
}