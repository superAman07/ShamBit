package com.shambit.customer.data.repository

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.data.mapper.toAddRequest
import com.shambit.customer.data.mapper.toDomainModel
import com.shambit.customer.data.mapper.toDomainModels
import com.shambit.customer.data.mapper.toUpdateRequest
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of AddressRepository interface
 * 
 * This class provides the concrete implementation for address operations,
 * using the ProfileApi to communicate with the backend and handling
 * data transformation between DTOs and domain models.
 * 
 * Requirements: 1.1, 2.1, 3.2, 3.3, 4.2
 */
@Singleton
class AddressRepositoryImpl @Inject constructor(
    private val profileApi: ProfileApi,
    private val addressCache: AddressCache
) : AddressRepository {
    
    /**
     * Get all user addresses with cache-first strategy
     * 
     * @return NetworkResult containing list of addresses or error
     */
    override suspend fun getAddresses(): NetworkResult<List<Address>> {
        // Try cache first if valid
        if (addressCache.isCacheValid()) {
            val cachedAddresses = addressCache.getCachedAddresses()
            if (cachedAddresses != null) {
                return NetworkResult.Success(cachedAddresses)
            }
        }
        
        // Fetch from API if cache is invalid or empty
        return when (val result = safeApiCall { profileApi.getAddresses() }) {
            is NetworkResult.Success -> {
                val addresses = result.data.toDomainModels()
                // Cache the fresh data
                addressCache.cacheAddresses(addresses)
                NetworkResult.Success(addresses)
            }
            is NetworkResult.Error -> {
                // If API fails, try to return cached data even if expired
                val cachedAddresses = addressCache.getCachedAddresses()
                if (cachedAddresses != null) {
                    NetworkResult.Success(cachedAddresses)
                } else {
                    NetworkResult.Error(result.message, result.code)
                }
            }
            is NetworkResult.Loading -> {
                NetworkResult.Loading
            }
        }
    }
    
    /**
     * Add new address and update cache
     * 
     * @param address The address to add
     * @return NetworkResult containing the created address or error
     */
    override suspend fun addAddress(address: Address): NetworkResult<Address> {
        val request = address.toAddRequest()
        return when (val result = safeApiCall { profileApi.addAddress(request) }) {
            is NetworkResult.Success -> {
                val newAddress = result.data.toDomainModel()
                // Update cache with new address
                val currentAddresses = addressCache.getCachedAddresses()?.toMutableList() ?: mutableListOf()
                currentAddresses.add(newAddress)
                addressCache.cacheAddresses(currentAddresses)
                NetworkResult.Success(newAddress)
            }
            is NetworkResult.Error -> {
                NetworkResult.Error(result.message, result.code)
            }
            is NetworkResult.Loading -> {
                NetworkResult.Loading
            }
        }
    }
    
    /**
     * Update existing address and update cache
     * 
     * @param id The address ID to update
     * @param address The updated address data
     * @return NetworkResult containing the updated address or error
     */
    override suspend fun updateAddress(id: String, address: Address): NetworkResult<Address> {
        val request = address.toUpdateRequest()
        return when (val result = safeApiCall { profileApi.updateAddress(id, request) }) {
            is NetworkResult.Success -> {
                val updatedAddress = result.data.toDomainModel()
                // Update cache with updated address
                addressCache.updateCachedAddress(updatedAddress)
                NetworkResult.Success(updatedAddress)
            }
            is NetworkResult.Error -> {
                NetworkResult.Error(result.message, result.code)
            }
            is NetworkResult.Loading -> {
                NetworkResult.Loading
            }
        }
    }
    
    /**
     * Delete address and update cache
     * 
     * @param id The address ID to delete
     * @return NetworkResult indicating success or error
     */
    override suspend fun deleteAddress(id: String): NetworkResult<Unit> {
        return when (val result = safeApiCall { profileApi.deleteAddress(id) }) {
            is NetworkResult.Success -> {
                // Remove from cache
                addressCache.removeCachedAddress(id)
                NetworkResult.Success(Unit)
            }
            is NetworkResult.Error -> {
                // Provide user-friendly error messages for specific error codes
                val userFriendlyMessage = when (result.code) {
                    "DATABASE_CONSTRAINT_VIOLATION" -> {
                        "Cannot delete this address as it's linked to existing orders. Please contact support if you need to remove it."
                    }
                    else -> result.message
                }
                NetworkResult.Error(userFriendlyMessage, result.code)
            }
            is NetworkResult.Loading -> {
                NetworkResult.Loading
            }
        }
    }
    
    /**
     * Set address as default and update cache
     * 
     * @param id The address ID to set as default
     * @return NetworkResult containing the updated address or error
     */
    override suspend fun setDefaultAddress(id: String): NetworkResult<Address> {
        return when (val result = safeApiCall { profileApi.setDefaultAddress(id) }) {
            is NetworkResult.Success -> {
                val updatedAddress = result.data.toDomainModel()
                // Update cache - need to refresh all addresses to update default status
                val currentAddresses = addressCache.getCachedAddresses()?.toMutableList()
                if (currentAddresses != null) {
                    // Update default status for all addresses
                    val updatedAddresses = currentAddresses.map { address ->
                        address.copy(isDefault = address.id == id)
                    }
                    addressCache.cacheAddresses(updatedAddresses)
                }
                NetworkResult.Success(updatedAddress)
            }
            is NetworkResult.Error -> {
                NetworkResult.Error(result.message, result.code)
            }
            is NetworkResult.Loading -> {
                NetworkResult.Loading
            }
        }
    }
    
    /**
     * Clear address cache to force fresh fetch from server
     */
    override suspend fun clearAddressCache() {
        addressCache.clear()
    }
}