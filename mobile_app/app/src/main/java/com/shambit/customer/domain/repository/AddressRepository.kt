package com.shambit.customer.domain.repository

import com.shambit.customer.domain.model.Address
import com.shambit.customer.util.NetworkResult

/**
 * Repository interface for address operations
 * 
 * This interface defines the contract for address data operations,
 * providing abstraction between the domain and data layers.
 * 
 * Requirements: 1.1, 2.1, 3.2, 3.3, 4.2
 */
interface AddressRepository {
    
    /**
     * Get all user addresses
     * 
     * @return NetworkResult containing list of addresses or error
     */
    suspend fun getAddresses(): NetworkResult<List<Address>>
    
    /**
     * Add new address
     * 
     * @param address The address to add
     * @return NetworkResult containing the created address or error
     */
    suspend fun addAddress(address: Address): NetworkResult<Address>
    
    /**
     * Update existing address
     * 
     * @param id The address ID to update
     * @param address The updated address data
     * @return NetworkResult containing the updated address or error
     */
    suspend fun updateAddress(id: String, address: Address): NetworkResult<Address>
    
    /**
     * Delete address
     * 
     * @param id The address ID to delete
     * @return NetworkResult indicating success or error
     */
    suspend fun deleteAddress(id: String): NetworkResult<Unit>
    
    /**
     * Set address as default
     * 
     * @param id The address ID to set as default
     * @return NetworkResult containing the updated address or error
     */
    suspend fun setDefaultAddress(id: String): NetworkResult<Address>
    
    /**
     * Clear address cache to force fresh fetch from server
     */
    suspend fun clearAddressCache()
}