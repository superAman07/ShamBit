package com.shambit.customer.data.remote.dto.request

import com.google.gson.annotations.SerializedName

/**
 * Register request
 */
data class RegisterRequest(
    @SerializedName("mobileNumber")
    val mobileNumber: String,
    
    @SerializedName("acceptedTerms")
    val acceptedTerms: Boolean = true
)

/**
 * Send OTP request
 */
data class SendOtpRequest(
    @SerializedName("mobileNumber")
    val mobileNumber: String
)

/**
 * Verify OTP request
 */
data class VerifyOtpRequest(
    @SerializedName("mobileNumber")
    val mobileNumber: String,
    
    @SerializedName("otp")
    val otp: String
)

/**
 * Refresh token request
 */
data class RefreshTokenRequest(
    @SerializedName("refreshToken")
    val refreshToken: String
)
