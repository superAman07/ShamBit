package com.shambit.customer.data.local.cache

import com.shambit.customer.domain.model.Address

/**
 * Interface for local address caching
 * 
 * Provides methods to cache, retrieve, update, and clear addresses locally.
 * Supports getting the default address efficiently.
 * 
 * Requirements: 4.1, 4.3
 */
interface AddressCache {
    
    /**
     * Cache a list of addresses
     * @param addresses List of addresses to cache
     */
    suspend fun cacheAddresses(addresses: List<Address>)
    
    /**
     * Get all cached addresses
     * @return List of cached addresses or null if no cache exists
     */
    suspend fun getCachedAddresses(): List<Address>?
    
    /**
     * Get the default address from cache
     * @return Default address or null if no default address exists
     */
    suspend fun getDefaultAddress(): Address?
    
    /**
     * Update a specific cached address
     * @param address Updated address to cache
     */
    suspend fun updateCachedAddress(address: Address)
    
    /**
     * Remove a specific address from cache
     * @param id ID of the address to remove
     */
    suspend fun removeCachedAddress(id: String)
    
    /**
     * Clear all cached addresses
     */
    suspend fun clear()
    
    /**
     * Check if address cache is valid (not expired)
     * @return true if cache is valid, false otherwise
     */
    suspend fun isCacheValid(): Boolean
}