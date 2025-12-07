package com.shambit.customer.data.repository

import com.shambit.customer.data.local.preferences.UserPreferences
import com.shambit.customer.data.remote.api.AuthApi
import com.shambit.customer.data.remote.dto.request.RefreshTokenRequest
import com.shambit.customer.data.remote.dto.request.RegisterRequest
import com.shambit.customer.data.remote.dto.request.SendOtpRequest
import com.shambit.customer.data.remote.dto.request.VerifyOtpRequest
import com.shambit.customer.data.remote.dto.response.AuthResponse
import com.shambit.customer.data.remote.dto.response.ProfileDto
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for authentication operations
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val userPreferences: UserPreferences
) {
    
    /**
     * Register new user
     */
    suspend fun register(mobileNumber: String): NetworkResult<Unit> {
        return safeApiCall {
            authApi.register(
                RegisterRequest(
                    mobileNumber = mobileNumber,
                    acceptedTerms = true
                )
            )
        }
    }
    
    /**
     * Send OTP for login
     */
    suspend fun sendOtp(mobileNumber: String): NetworkResult<Unit> {
        return safeApiCall {
            authApi.sendOtp(
                SendOtpRequest(mobileNumber = mobileNumber)
            )
        }
    }
    
    /**
     * Verify OTP and login
     */
    suspend fun verifyOtp(
        mobileNumber: String,
        otp: String
    ): NetworkResult<AuthResponse> {
        val result = safeApiCall {
            authApi.verifyOtp(
                VerifyOtpRequest(
                    mobileNumber = mobileNumber,
                    otp = otp
                )
            )
        }
        
        // Save tokens and user info if successful
        if (result is NetworkResult.Success) {
            val authResponse = result.data
            userPreferences.saveTokens(
                accessToken = authResponse.tokens.accessToken,
                refreshToken = authResponse.tokens.refreshToken
            )
            userPreferences.saveUserInfo(
                userId = authResponse.user.id,
                name = authResponse.user.name,
                mobile = authResponse.user.mobileNumber,
                email = authResponse.user.email
            )
        }
        
        return result
    }
    
    /**
     * Refresh access token
     */
    suspend fun refreshToken(): NetworkResult<String> {
        val refreshToken = userPreferences.getRefreshToken().first()
            ?: return NetworkResult.Error("No refresh token found")
        
        val result = safeApiCall {
            authApi.refreshToken(
                RefreshTokenRequest(refreshToken = refreshToken)
            )
        }
        
        // Save new tokens if successful
        if (result is NetworkResult.Success) {
            val tokens = result.data.tokens
            userPreferences.saveTokens(
                accessToken = tokens.accessToken,
                refreshToken = tokens.refreshToken
            )
            return NetworkResult.Success(tokens.accessToken)
        }
        
        return NetworkResult.Error("Failed to refresh token")
    }
    
    /**
     * Logout
     */
    suspend fun logout(): NetworkResult<Unit> {
        val refreshToken = userPreferences.getRefreshToken().first()
        
        val result = if (refreshToken != null) {
            safeApiCall {
                authApi.logout(
                    RefreshTokenRequest(refreshToken = refreshToken)
                )
            }
        } else {
            NetworkResult.Success(Unit)
        }
        
        // Clear local data regardless of API result
        userPreferences.clearAll()
        
        return result
    }
    
    /**
     * Get current user profile
     */
    suspend fun getProfile(): NetworkResult<ProfileDto> {
        return safeApiCall {
            authApi.getProfile()
        }
    }
    
    /**
     * Check if user is logged in
     */
    suspend fun isLoggedIn(): Boolean {
        return userPreferences.isLoggedIn().first()
    }
}
