package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.LocationApi
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.request.AddAddressRequest
import com.shambit.customer.data.remote.dto.request.UpdateAddressRequest
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.remote.dto.response.ReverseGeocodeResponse
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for address operations
 */
@Singleton
class AddressRepository @Inject constructor(
    private val profileApi: ProfileApi,
    private val locationApi: LocationApi
) {
    
    // Cached addresses with reactive updates
    private val _addresses = MutableStateFlow<List<AddressDto>>(emptyList())
    val addresses: StateFlow<List<AddressDto>> = _addresses.asStateFlow()
    
    /**
     * Get all user addresses
     */
    suspend fun getAddresses(): NetworkResult<List<AddressDto>> {
        return safeApiCall {
            profileApi.getAddresses()
        }.also { result ->
            // Update cache on success
            if (result is NetworkResult.Success) {
                _addresses.value = result.data
            }
        }
    }
    
    /**
     * Add new address
     */
    suspend fun addAddress(request: AddAddressRequest): NetworkResult<AddressDto> {
        return safeApiCall {
            profileApi.addAddress(request)
        }.also { result ->
            // Refresh cache on success
            if (result is NetworkResult.Success) {
                getAddresses()
            }
        }
    }
    
    /**
     * Update address
     */
    suspend fun updateAddress(
        addressId: String,
        request: UpdateAddressRequest
    ): NetworkResult<AddressDto> {
        return safeApiCall {
            profileApi.updateAddress(addressId, request)
        }.also { result ->
            // Refresh cache on success
            if (result is NetworkResult.Success) {
                getAddresses()
            }
        }
    }
    
    /**
     * Delete address
     */
    suspend fun deleteAddress(addressId: String): NetworkResult<Unit> {
        return when (val result = safeApiCall { profileApi.deleteAddress(addressId) }) {
            is NetworkResult.Success -> {
                // Refresh cache on success
                getAddresses()
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
            is NetworkResult.Loading -> NetworkResult.Loading
        }
    }
    
    /**
     * Set default address
     */
    suspend fun setDefaultAddress(addressId: String): NetworkResult<AddressDto> {
        return safeApiCall {
            profileApi.setDefaultAddress(addressId)
        }.also { result ->
            // Update cache immediately on success
            if (result is NetworkResult.Success) {
                // Update the cache to reflect the new default
                val updatedAddresses = _addresses.value.map { address ->
                    address.copy(isDefault = address.id == addressId)
                }
                _addresses.value = updatedAddresses
            }
        }
    }
    
    /**
     * Clear address cache to force fresh fetch from server
     */
    suspend fun clearAddressCache() {
        _addresses.value = emptyList()
    }
    
    /**
     * Reverse geocode coordinates to address
     */
    suspend fun reverseGeocode(
        latitude: Double,
        longitude: Double
    ): NetworkResult<ReverseGeocodeResponse> {
        return safeApiCall {
            locationApi.reverseGeocode(latitude, longitude)
        }
    }
}
