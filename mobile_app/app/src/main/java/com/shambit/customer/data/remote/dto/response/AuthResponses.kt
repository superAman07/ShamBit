package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Login/Register response
 */
data class AuthResponse(
    @SerializedName("user")
    val user: UserDto,
    
    @SerializedName("tokens")
    val tokens: TokensDto
)

data class UserDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("mobileNumber")
    val mobileNumber: String,
    
    @SerializedName("name")
    val name: String? = null,
    
    @SerializedName("email")
    val email: String? = null,
    
    @SerializedName("isActive")
    val isActive: Boolean,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("lastLoginAt")
    val lastLoginAt: String? = null
)

data class TokensDto(
    @SerializedName("accessToken")
    val accessToken: String,
    
    @SerializedName("refreshToken")
    val refreshToken: String
)

/**
 * Refresh token response
 */
data class RefreshTokenResponse(
    @SerializedName("tokens")
    val tokens: TokensDto
)
