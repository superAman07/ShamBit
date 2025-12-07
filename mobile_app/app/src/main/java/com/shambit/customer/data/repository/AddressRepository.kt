package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.LocationApi
import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.request.AddAddressRequest
import com.shambit.customer.data.remote.dto.request.UpdateAddressRequest
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.remote.dto.response.ReverseGeocodeResponse
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
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
    
    /**
     * Get all user addresses
     */
    suspend fun getAddresses(): NetworkResult<List<AddressDto>> {
        return safeApiCall {
            profileApi.getAddresses()
        }
    }
    
    /**
     * Add new address
     */
    suspend fun addAddress(request: AddAddressRequest): NetworkResult<AddressDto> {
        return safeApiCall {
            profileApi.addAddress(request)
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
        }
    }
    
    /**
     * Delete address
     */
    suspend fun deleteAddress(addressId: String): NetworkResult<Unit> {
        return safeApiCall {
            profileApi.deleteAddress(addressId)
        }
    }
    
    /**
     * Set default address
     */
    suspend fun setDefaultAddress(addressId: String): NetworkResult<AddressDto> {
        return safeApiCall {
            profileApi.setDefaultAddress(addressId)
        }
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
