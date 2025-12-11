package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for selecting an address for checkout
 * 
 * This use case handles address selection during the checkout flow.
 * It validates that the selected address exists and is available for checkout.
 * 
 * Requirements: 5.3, 7.3
 */
class SelectCheckoutAddressUseCase @Inject constructor(
    private val addressCache: AddressCache
) {
    
    /**
     * Select an address for checkout
     * 
     * @param addressId ID of the address to select for checkout
     * @return NetworkResult containing the selected address or error
     */
    suspend operator fun invoke(addressId: String): NetworkResult<Address> {
        return try {
            // Get all cached addresses
            val addresses = addressCache.getCachedAddresses()
                ?: return NetworkResult.Error("No addresses available", "NO_ADDRESSES")
            
            // Find the selected address
            val selectedAddress = addresses.find { it.id == addressId }
                ?: return NetworkResult.Error("Address not found", "ADDRESS_NOT_FOUND")
            
            // Return the selected address
            NetworkResult.Success(selectedAddress)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to select checkout address: ${e.message}")
        }
    }
    
    /**
     * Get all available addresses for selection
     * 
     * @return NetworkResult containing list of all available addresses
     */
    suspend fun getAvailableAddresses(): NetworkResult<List<Address>> {
        return try {
            val addresses = addressCache.getCachedAddresses() ?: emptyList()
            NetworkResult.Success(addresses)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to get available addresses: ${e.message}")
        }
    }
}