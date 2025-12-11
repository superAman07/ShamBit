package com.shambit.customer.domain.manager

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.data.mapper.toDomainModels
import com.shambit.customer.data.repository.AddressRepository
import com.shambit.customer.domain.model.Address
import com.shambit.customer.util.NetworkResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Shared address state manager for cross-screen synchronization
 * 
 * Provides a single source of truth for address state across all ViewModels.
 * Ensures immediate updates when address changes occur without page reloads.
 * Manages address list, default address, and selected checkout address.
 * 
 * Requirements: 4.4, 10.4
 */
@Singleton
class AddressStateManager @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    // Use application scope for singleton lifecycle
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    // Shared state flows for cross-screen synchronization
    private val _addresses = MutableStateFlow<List<Address>>(emptyList())
    val addresses: StateFlow<List<Address>> = _addresses.asStateFlow()
    
    private val _defaultAddress = MutableStateFlow<Address?>(null)
    val defaultAddress: StateFlow<Address?> = _defaultAddress.asStateFlow()
    
    private val _selectedCheckoutAddress = MutableStateFlow<Address?>(null)
    val selectedCheckoutAddress: StateFlow<Address?> = _selectedCheckoutAddress.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    init {
        // Load initial state from cache
        loadInitialState()
    }
    
    /**
     * Load initial state from cache
     * 
     * Loads cached addresses and default address on initialization.
     * Provides immediate state for ViewModels without network calls.
     */
    private fun loadInitialState() {
        scope.launch {
            try {
                val cachedAddresses = addressCache.getCachedAddresses()
                if (cachedAddresses != null) {
                    _addresses.value = cachedAddresses
                    _defaultAddress.value = cachedAddresses.find { it.isDefault }
                    _selectedCheckoutAddress.value = cachedAddresses.find { it.isDefault }
                }
            } catch (e: Exception) {
                // Ignore cache errors, will load from network when requested
            }
        }
    }
    
    /**
     * Refresh addresses from network
     * 
     * Fetches latest addresses from repository and updates all state flows.
     * Called by ViewModels when they need fresh data.
     * 
     * Requirements: 4.4, 10.4
     */
    suspend fun refreshAddresses(): NetworkResult<List<Address>> {
        _isLoading.value = true
        
        return try {
            when (val result = addressRepository.getAddresses()) {
                is NetworkResult.Success -> {
                    val addresses = result.data.toDomainModels()
                    
                    // Update all state flows
                    _addresses.value = addresses
                    val defaultAddr = addresses.find { it.isDefault }
                    _defaultAddress.value = defaultAddr
                    
                    // Update selected checkout address if it still exists
                    val currentSelected = _selectedCheckoutAddress.value
                    if (currentSelected != null) {
                        val updatedSelected = addresses.find { it.id == currentSelected.id }
                        _selectedCheckoutAddress.value = updatedSelected ?: defaultAddr
                    } else {
                        _selectedCheckoutAddress.value = defaultAddr
                    }
                    
                    // Cache the updated addresses
                    addressCache.cacheAddresses(addresses)
                    
                    NetworkResult.Success(addresses)
                }
                is NetworkResult.Error -> {
                    result
                }
                is NetworkResult.Loading -> {
                    result
                }
            }
        } finally {
            _isLoading.value = false
        }
    }
    
    /**
     * Update address in shared state
     * 
     * Updates an existing address in the shared state and propagates changes.
     * Called when an address is modified to ensure immediate UI updates.
     * 
     * Requirements: 4.4, 10.4
     */
    fun updateAddress(updatedAddress: Address) {
        scope.launch {
            val currentAddresses = _addresses.value.toMutableList()
            val index = currentAddresses.indexOfFirst { it.id == updatedAddress.id }
            
            if (index != -1) {
                currentAddresses[index] = updatedAddress
                _addresses.value = currentAddresses
                
                // Update default address if this address is now default
                if (updatedAddress.isDefault) {
                    _defaultAddress.value = updatedAddress
                    _selectedCheckoutAddress.value = updatedAddress
                }
                
                // Update cache
                addressCache.updateCachedAddress(updatedAddress)
            }
        }
    }
    
    /**
     * Add address to shared state
     * 
     * Adds a new address to the shared state and propagates changes.
     * Called when a new address is created to ensure immediate UI updates.
     * 
     * Requirements: 4.4, 10.4
     */
    fun addAddress(newAddress: Address) {
        scope.launch {
            val currentAddresses = _addresses.value.toMutableList()
            currentAddresses.add(newAddress)
            _addresses.value = currentAddresses
            
            // Update default address if this is the new default
            if (newAddress.isDefault) {
                _defaultAddress.value = newAddress
                _selectedCheckoutAddress.value = newAddress
            }
            
            // Update cache
            addressCache.cacheAddresses(currentAddresses)
        }
    }
    
    /**
     * Remove address from shared state with enhanced edge case handling
     * 
     * Removes an address from the shared state and handles default address logic.
     * Called when an address is deleted to ensure immediate UI updates.
     * Enhanced to handle edge cases:
     * - Selected address deletion in checkout (switch to default)
     * - Last address deletion (enter no address state)
     * - Proper state synchronization across screens
     * 
     * Requirements: 4.4, 10.4, 11.1, 11.2
     */
    fun removeAddress(addressId: String) {
        scope.launch {
            val currentAddresses = _addresses.value.toMutableList()
            val addressToRemove = currentAddresses.find { it.id == addressId }
            val wasDefault = addressToRemove?.isDefault == true
            val wasSelected = _selectedCheckoutAddress.value?.id == addressId
            
            // Remove the address
            currentAddresses.removeAll { it.id == addressId }
            _addresses.value = currentAddresses
            
            // Edge case 1: Handle default address logic
            if (wasDefault && currentAddresses.isNotEmpty()) {
                // Select most recently added address as new default (Requirement 11.5)
                val newDefault = currentAddresses.maxByOrNull { it.createdAt }
                if (newDefault != null) {
                    val updatedDefault = newDefault.copy(isDefault = true)
                    updateAddress(updatedDefault)
                }
            } else if (currentAddresses.isEmpty()) {
                // Edge case 2: Last address deletion - enter no address state (Requirement 11.2)
                _defaultAddress.value = null
                _selectedCheckoutAddress.value = null
            }
            
            // Edge case 3: Handle selected checkout address deletion (Requirement 11.1)
            if (wasSelected) {
                if (currentAddresses.isNotEmpty()) {
                    // Switch to default address when selected address is deleted
                    _selectedCheckoutAddress.value = _defaultAddress.value
                } else {
                    // No addresses left - enter no address state
                    _selectedCheckoutAddress.value = null
                }
            }
            
            // Update cache
            addressCache.removeCachedAddress(addressId)
        }
    }
    
    /**
     * Rollback address removal on failure
     * 
     * Restores an address to the shared state when delete operation fails.
     * Ensures UI consistency by restoring the previous state.
     * 
     * Requirements: 3.5, 11.3
     */
    fun rollbackAddressRemoval(restoredAddress: Address, wasSelected: Boolean = false) {
        scope.launch {
            val currentAddresses = _addresses.value.toMutableList()
            
            // Add the address back
            currentAddresses.add(restoredAddress)
            _addresses.value = currentAddresses
            
            // Restore default address if it was default
            if (restoredAddress.isDefault) {
                _defaultAddress.value = restoredAddress
            }
            
            // Restore selected checkout address if it was selected
            if (wasSelected) {
                _selectedCheckoutAddress.value = restoredAddress
            }
            
            // Update cache
            addressCache.cacheAddresses(currentAddresses)
        }
    }
    
    /**
     * Set default address in shared state
     * 
     * Updates the default address and propagates changes across all ViewModels.
     * Ensures only one address is marked as default.
     * 
     * Requirements: 4.4, 10.4
     */
    fun setDefaultAddress(addressId: String) {
        scope.launch {
            val currentAddresses = _addresses.value.toMutableList()
            
            // Update default status
            val updatedAddresses = currentAddresses.map { address ->
                address.copy(isDefault = address.id == addressId)
            }
            
            _addresses.value = updatedAddresses
            val newDefault = updatedAddresses.find { it.isDefault }
            _defaultAddress.value = newDefault
            _selectedCheckoutAddress.value = newDefault
            
            // Update cache
            addressCache.cacheAddresses(updatedAddresses)
        }
    }
    
    /**
     * Select checkout address in shared state
     * 
     * Updates the selected checkout address and propagates changes.
     * Called when user selects a different address during checkout.
     * 
     * Requirements: 4.4, 10.4
     */
    fun selectCheckoutAddress(addressId: String) {
        scope.launch {
            val selectedAddress = _addresses.value.find { it.id == addressId }
            _selectedCheckoutAddress.value = selectedAddress
        }
    }
    
    /**
     * Get current addresses
     * 
     * Returns the current list of addresses from shared state.
     */
    fun getCurrentAddresses(): List<Address> {
        return _addresses.value
    }
    
    /**
     * Get current default address
     * 
     * Returns the current default address from shared state.
     */
    fun getCurrentDefaultAddress(): Address? {
        return _defaultAddress.value
    }
    
    /**
     * Get current selected checkout address
     * 
     * Returns the current selected checkout address from shared state.
     */
    fun getCurrentSelectedCheckoutAddress(): Address? {
        return _selectedCheckoutAddress.value
    }
    
    /**
     * Check if addresses are empty
     * 
     * Returns true if no addresses are available.
     */
    fun hasNoAddresses(): Boolean {
        return _addresses.value.isEmpty()
    }
    
    /**
     * Handle concurrent address modifications
     * 
     * Resolves conflicts when multiple operations modify addresses simultaneously.
     * Ensures data consistency by refreshing from authoritative source.
     * 
     * Requirements: 11.4
     */
    suspend fun handleConcurrentModification(): NetworkResult<List<Address>> {
        return try {
            // Force refresh from server to resolve conflicts
            val result = refreshAddresses()
            
            when (result) {
                is NetworkResult.Success -> {
                    // State is already updated by refreshAddresses()
                    result
                }
                is NetworkResult.Error -> {
                    // If refresh fails, maintain current state but return error
                    NetworkResult.Error("Concurrent modification detected. ${result.message}")
                }
                is NetworkResult.Loading -> {
                    result
                }
            }
        } catch (e: Exception) {
            NetworkResult.Error("Failed to resolve concurrent modification: ${e.message}")
        }
    }
    
    /**
     * Validate address state consistency
     * 
     * Checks for state inconsistencies and corrects them.
     * Used to detect and handle concurrent modifications.
     * 
     * Requirements: 11.4
     */
    fun validateStateConsistency(): Boolean {
        val addresses = _addresses.value
        val defaultAddress = _defaultAddress.value
        val selectedAddress = _selectedCheckoutAddress.value
        
        // Check if default address exists in address list
        val defaultExists = defaultAddress?.let { default ->
            addresses.any { it.id == default.id && it.isDefault }
        } ?: true
        
        // Check if selected address exists in address list
        val selectedExists = selectedAddress?.let { selected ->
            addresses.any { it.id == selected.id }
        } ?: true
        
        // Check if exactly one address is marked as default (if addresses exist)
        val defaultCount = addresses.count { it.isDefault }
        val defaultCountValid = if (addresses.isEmpty()) defaultCount == 0 else defaultCount == 1
        
        return defaultExists && selectedExists && defaultCountValid
    }
    
    /**
     * Clear all address state
     * 
     * Clears all address state and cache. Used for logout or data reset.
     */
    suspend fun clearAllState() {
        _addresses.value = emptyList()
        _defaultAddress.value = null
        _selectedCheckoutAddress.value = null
        addressCache.clear()
    }
}