package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.ReverseGeocodeResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Location API endpoints
 */
interface LocationApi {
    
    /**
     * Reverse geocode coordinates to address
     * GET /location/reverse-geocode
     */
    @GET("location/reverse-geocode")
    suspend fun reverseGeocode(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<ApiResponse<ReverseGeocodeResponse>>
}
