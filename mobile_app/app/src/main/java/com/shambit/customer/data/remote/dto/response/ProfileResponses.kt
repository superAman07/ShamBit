package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * User profile DTO
 */
data class ProfileDto(
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

/**
 * Address DTO
 */
data class AddressDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("phoneNumber")
    val phoneNumber: String,
    
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
    val isDefault: Boolean = false,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("updatedAt")
    val updatedAt: String
)

/**
 * Notification DTO
 */
data class NotificationDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("type")
    val type: String,
    
    @SerializedName("channel")
    val channel: String, // "push", "sms", "email"
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("body")
    val body: String,
    
    @SerializedName("data")
    val data: Map<String, Any>? = null,
    
    @SerializedName("status")
    val status: String, // "sent", "failed", "pending"
    
    @SerializedName("sentAt")
    val sentAt: String? = null,
    
    @SerializedName("createdAt")
    val createdAt: String
)

/**
 * Notification history response
 */
data class NotificationHistoryResponse(
    @SerializedName("notifications")
    val notifications: List<NotificationDto>,
    
    @SerializedName("pagination")
    val pagination: com.shambit.customer.data.remote.dto.Pagination
)

/**
 * Reverse geocode response
 */
data class ReverseGeocodeResponse(
    @SerializedName("address")
    val address: String,
    
    @SerializedName("city")
    val city: String,
    
    @SerializedName("state")
    val state: String,
    
    @SerializedName("pincode")
    val pincode: String,
    
    @SerializedName("area")
    val area: String
)
