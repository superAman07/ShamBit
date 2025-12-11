package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for getting addresses with cache-first strategy
 * 
 * This use case implements a cache-first strategy where cached addresses
 * are returned immediately if available and valid, while fresh data is
 * fetched from the network in the background.
 * 
 * Requirements: 4.1
 */
class GetAddressesUseCase @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    /**
     * Get addresses using cache-first strategy
     * 
     * Strategy:
     * 1. Check if cache is valid and has data
     * 2. If yes, return cached data immediately
     * 3. Fetch fresh data from network
     * 4. Update cache with fresh data
     * 5. Return fresh data if cache was invalid/empty
     * 
     * @param forceRefresh If true, skip cache and fetch from network
     * @return NetworkResult containing list of addresses
     */
    suspend operator fun invoke(forceRefresh: Boolean = false): NetworkResult<List<Address>> {
        return try {
            // If not forcing refresh, try to get cached data first
            if (!forceRefresh) {
                val cachedAddresses = addressCache.getCachedAddresses()
                val isCacheValid = addressCache.isCacheValid()
                
                if (cachedAddresses != null && isCacheValid) {
                    // Return cached data immediately and fetch fresh data in background
                    fetchAndCacheAddresses()
                    return NetworkResult.Success(cachedAddresses)
                }
            }
            
            // Fetch fresh data from network
            fetchAndCacheAddresses()
        } catch (e: Exception) {
            // If network fails, try to return cached data as fallback
            val cachedAddresses = addressCache.getCachedAddresses()
            if (cachedAddresses != null) {
                NetworkResult.Success(cachedAddresses)
            } else {
                NetworkResult.Error("Failed to load addresses: ${e.message}")
            }
        }
    }
    
    /**
     * Fetch addresses from network and update cache
     */
    private suspend fun fetchAndCacheAddresses(): NetworkResult<List<Address>> {
        return when (val result = addressRepository.getAddresses()) {
            is NetworkResult.Success -> {
                // Update cache with fresh data
                addressCache.cacheAddresses(result.data)
                result
            }
            is NetworkResult.Error -> {
                result
            }
            is NetworkResult.Loading -> {
                result
            }
        }
    }
}