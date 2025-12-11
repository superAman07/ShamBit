package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for getting the checkout address
 * 
 * This use case provides the address to be used in checkout flow.
 * It returns the default address or null if no addresses exist.
 * 
 * Requirements: 7.1, 8.1
 */
class GetCheckoutAddressUseCase @Inject constructor(
    private val addressCache: AddressCache
) {
    
    /**
     * Get the address for checkout
     * 
     * Returns the default address for checkout. If no default address exists,
     * returns null indicating the "no address state".
     * 
     * @return NetworkResult containing the checkout address or null if no addresses exist
     */
    suspend operator fun invoke(): NetworkResult<Address?> {
        return try {
            val defaultAddress = addressCache.getDefaultAddress()
            NetworkResult.Success(defaultAddress)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to get checkout address: ${e.message}")
        }
    }
    
    /**
     * Check if user has any addresses for checkout
     * 
     * @return NetworkResult containing boolean indicating if addresses exist
     */
    suspend fun hasAddresses(): NetworkResult<Boolean> {
        return try {
            val addresses = addressCache.getCachedAddresses()
            NetworkResult.Success(addresses?.isNotEmpty() == true)
        } catch (e: Exception) {
            NetworkResult.Error("Failed to check address availability: ${e.message}")
        }
    }
}