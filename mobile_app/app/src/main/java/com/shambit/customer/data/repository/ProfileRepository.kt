package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.ProfileApi
import com.shambit.customer.data.remote.dto.request.UpdateProfileRequest
import com.shambit.customer.data.remote.dto.response.ProfileDto
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for profile operations
 */
@Singleton
class ProfileRepository @Inject constructor(
    private val profileApi: ProfileApi
) {
    
    /**
     * Get user profile
     */
    suspend fun getProfile(): NetworkResult<ProfileDto> {
        return safeApiCall {
            profileApi.getProfile()
        }
    }
    
    /**
     * Update user profile
     */
    suspend fun updateProfile(
        name: String?,
        email: String?
    ): NetworkResult<ProfileDto> {
        return safeApiCall {
            profileApi.updateProfile(
                UpdateProfileRequest(
                    name = name,
                    email = email
                )
            )
        }
    }
    
    /**
     * Delete account
     */
    suspend fun deleteAccount(): NetworkResult<Unit> {
        return safeApiCall {
            profileApi.deleteAccount()
        }
    }
}
