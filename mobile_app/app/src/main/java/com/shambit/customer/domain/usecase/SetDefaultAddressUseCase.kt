package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for setting an address as default
 * 
 * This use case handles the complete flow of setting a default address:
 * 1. Validates that the address exists
 * 2. Ensures single default address invariant
 * 3. Updates cache after successful change
 * 
 * Requirements: 4.1, 4.2
 */
class SetDefaultAddressUseCase @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    /**
     * Set an address as the default address
     * 
     * @param id ID of the address to set as default
     * @return NetworkResult containing the updated address or error
     */
    suspend operator fun invoke(id: String): NetworkResult<Address> {
        try {
            // Get existing addresses from cache
            val existingAddresses = addressCache.getCachedAddresses() ?: emptyList()
            val addressToSetDefault = existingAddresses.find { it.id == id }
                ?: return NetworkResult.Error("Address not found", "ADDRESS_NOT_FOUND")
            
            // Check if this address is already default
            if (addressToSetDefault.isDefault) {
                return NetworkResult.Success(addressToSetDefault)
            }
            
            // Set address as default via repository
            return when (val result = addressRepository.setDefaultAddress(id)) {
                is NetworkResult.Success -> {
                    // Update cache to maintain single default invariant
                    val updatedAddresses = existingAddresses.map { address ->
                        when {
                            address.id == id -> result.data // Use the updated address from server
                            address.isDefault -> address.copy(isDefault = false) // Remove default from others
                            else -> address // Keep unchanged
                        }
                    }
                    
                    // Update cache
                    addressCache.cacheAddresses(updatedAddresses)
                    
                    result
                }
                is NetworkResult.Error -> {
                    result
                }
                is NetworkResult.Loading -> {
                    result
                }
            }
        } catch (e: Exception) {
            return NetworkResult.Error("Failed to set default address: ${e.message}")
        }
    }
}