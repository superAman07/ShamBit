package com.shambit.customer.data.remote.dto.request

import com.google.gson.annotations.SerializedName

/**
 * Update profile request
 */
data class UpdateProfileRequest(
    @SerializedName("name")
    val name: String? = null,
    
    @SerializedName("email")
    val email: String? = null
)

/**
 * Add address request
 */
data class AddAddressRequest(
    @SerializedName("type")
    val type: String, // "home", "work", "other"
    
    @SerializedName("addressLine1")
    val addressLine1: String,
    
    @SerializedName("addressLine2")
    val addressLine2: String? = null,
    
    @SerializedName("city")
    val city: String,
    
    @SerializedName("state")
    val state: String,
    
    @SerializedName("pincode")
    val pincode: String,
    
    @SerializedName("landmark")
    val landmark: String? = null,
    
    @SerializedName("latitude")
    val latitude: Double? = null,
    
    @SerializedName("longitude")
    val longitude: Double? = null,
    
    @SerializedName("isDefault")
    val isDefault: Boolean = false
)

/**
 * Update address request
 */
data class UpdateAddressRequest(
    @SerializedName("type")
    val type: String? = null,
    
    @SerializedName("addressLine1")
    val addressLine1: String? = null,
    
    @SerializedName("addressLine2")
    val addressLine2: String? = null,
    
    @SerializedName("city")
    val city: String? = null,
    
    @SerializedName("state")
    val state: String? = null,
    
    @SerializedName("pincode")
    val pincode: String? = null,
    
    @SerializedName("landmark")
    val landmark: String? = null,
    
    @SerializedName("latitude")
    val latitude: Double? = null,
    
    @SerializedName("longitude")
    val longitude: Double? = null,
    
    @SerializedName("isDefault")
    val isDefault: Boolean? = null
)

/**
 * Register device token request
 */
data class RegisterDeviceTokenRequest(
    @SerializedName("token")
    val token: String,
    
    @SerializedName("platform")
    val platform: String = "android"
)
