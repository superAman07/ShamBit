package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.request.AddAddressRequest
import com.shambit.customer.data.remote.dto.request.RegisterDeviceTokenRequest
import com.shambit.customer.data.remote.dto.request.UpdateAddressRequest
import com.shambit.customer.data.remote.dto.request.UpdateProfileRequest
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.data.remote.dto.response.NotificationHistoryResponse
import com.shambit.customer.data.remote.dto.response.ProfileDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Profile API endpoints
 */
interface ProfileApi {
    
    /**
     * Get user profile
     * GET /profile
     */
    @GET("profile")
    suspend fun getProfile(): Response<ApiResponse<ProfileDto>>
    
    /**
     * Update user profile
     * PUT /profile
     */
    @PUT("profile")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): Response<ApiResponse<ProfileDto>>
    
    /**
     * Get user addresses
     * GET /profile/addresses
     */
    @GET("profile/addresses")
    suspend fun getAddresses(): Response<ApiResponse<List<AddressDto>>>
    
    /**
     * Add new address
     * POST /profile/addresses
     */
    @POST("profile/addresses")
    suspend fun addAddress(
        @Body request: AddAddressRequest
    ): Response<ApiResponse<AddressDto>>
    
    /**
     * Update address
     * PUT /profile/addresses/:id
     */
    @PUT("profile/addresses/{id}")
    suspend fun updateAddress(
        @Path("id") addressId: String,
        @Body request: UpdateAddressRequest
    ): Response<ApiResponse<AddressDto>>
    
    /**
     * Delete address
     * DELETE /profile/addresses/:id
     */
    @DELETE("profile/addresses/{id}")
    suspend fun deleteAddress(
        @Path("id") addressId: String
    ): Response<ApiResponse<Unit>>
    
    /**
     * Set default address
     * POST /profile/addresses/:id/set-default
     */
    @POST("profile/addresses/{id}/set-default")
    suspend fun setDefaultAddress(
        @Path("id") addressId: String
    ): Response<ApiResponse<AddressDto>>
    
    /**
     * Register device token for push notifications
     * POST /notifications/device-token
     */
    @POST("notifications/device-token")
    suspend fun registerDeviceToken(
        @Body request: RegisterDeviceTokenRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * Get notification history
     * GET /notifications/history
     */
    @GET("notifications/history")
    suspend fun getNotificationHistory(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<ApiResponse<NotificationHistoryResponse>>
    
    /**
     * Delete account
     * DELETE /profile/account
     */
    @DELETE("profile/account")
    suspend fun deleteAccount(): Response<ApiResponse<Unit>>
}
