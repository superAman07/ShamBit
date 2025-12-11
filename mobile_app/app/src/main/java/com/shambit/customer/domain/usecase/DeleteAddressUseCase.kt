package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for deleting an address with default handling logic
 * 
 * This use case handles the complete flow of deleting an address:
 * 1. Validates that the address exists
 * 2. Handles default address deletion (auto-select new default)
 * 3. Handles last address deletion (enter no address state)
 * 4. Updates cache after successful deletion
 * 
 * Requirements: 3.2, 3.3, 11.5
 */
class DeleteAddressUseCase @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    /**
     * Delete an address with proper default handling
     * 
     * @param id ID of the address to delete
     * @return NetworkResult indicating success or error
     */
    suspend operator fun invoke(id: String): NetworkResult<Unit> {
        try {
            // Get existing addresses from cache
            val existingAddresses = addressCache.getCachedAddresses() ?: emptyList()
            val addressToDelete = existingAddresses.find { it.id == id }
                ?: return NetworkResult.Error("Address not found", "ADDRESS_NOT_FOUND")
            
            // Delete address via repository
            return when (val result = addressRepository.deleteAddress(id)) {
                is NetworkResult.Success -> {
                    // Update cache after successful deletion
                    val remainingAddresses = existingAddresses.filter { it.id != id }.toMutableList()
                    
                    // Handle default address logic
                    if (addressToDelete.isDefault && remainingAddresses.isNotEmpty()) {
                        // Select new default address (most recently added)
                        val newDefaultAddress = selectNewDefaultAddress(remainingAddresses)
                        
                        // Update the new default address in the list
                        val index = remainingAddresses.indexOfFirst { it.id == newDefaultAddress.id }
                        if (index != -1) {
                            remainingAddresses[index] = newDefaultAddress.copy(isDefault = true)
                        }
                        
                        // Update the default address on the server
                        when (val setDefaultResult = addressRepository.setDefaultAddress(newDefaultAddress.id)) {
                            is NetworkResult.Success -> {
                                // Update cache with the corrected default status
                                remainingAddresses[index] = setDefaultResult.data
                            }
                            is NetworkResult.Error -> {
                                // If setting default fails, still proceed with local update
                                // The next sync will correct this
                            }
                            is NetworkResult.Loading -> {
                                // Should not happen in this context
                            }
                        }
                    }
                    
                    // Update cache with remaining addresses
                    addressCache.cacheAddresses(remainingAddresses)
                    
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
            return NetworkResult.Error("Failed to delete address: ${e.message}")
        }
    }
    
    /**
     * Select new default address from remaining addresses
     * Selects the most recently added address as per requirement 11.5
     * 
     * @param addresses List of remaining addresses
     * @return Address to be set as new default
     */
    private fun selectNewDefaultAddress(addresses: List<Address>): Address {
        return addresses.maxByOrNull { it.createdAt }
            ?: throw IllegalStateException("No addresses available to select as default")
    }
}