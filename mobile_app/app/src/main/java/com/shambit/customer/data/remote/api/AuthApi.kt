package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.request.RefreshTokenRequest
import com.shambit.customer.data.remote.dto.request.RegisterRequest
import com.shambit.customer.data.remote.dto.request.SendOtpRequest
import com.shambit.customer.data.remote.dto.request.VerifyOtpRequest
import com.shambit.customer.data.remote.dto.response.AuthResponse
import com.shambit.customer.data.remote.dto.response.ProfileDto
import com.shambit.customer.data.remote.dto.response.RefreshTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Authentication API endpoints
 */
interface AuthApi {
    
    /**
     * Register new user
     * POST /auth/register
     */
    @POST("auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * Send OTP for login
     * POST /auth/send-otp
     */
    @POST("auth/send-otp")
    suspend fun sendOtp(
        @Body request: SendOtpRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * Verify OTP and login
     * POST /auth/verify-otp
     */
    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<ApiResponse<AuthResponse>>
    
    /**
     * Refresh access token
     * POST /auth/refresh-token
     */
    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<ApiResponse<RefreshTokenResponse>>
    
    /**
     * Logout
     * POST /auth/logout
     */
    @POST("auth/logout")
    suspend fun logout(
        @Body request: RefreshTokenRequest
    ): Response<ApiResponse<Unit>>
    
    /**
     * Get current user profile
     * GET /auth/me
     */
    @GET("auth/me")
    suspend fun getProfile(): Response<ApiResponse<ProfileDto>>
}
