package com.shambit.customer.data.remote.dto.request

import com.google.gson.annotations.SerializedName

/**
 * Create order request
 */
data class CreateOrderRequest(
    @SerializedName("items")
    val items: List<OrderItem>,
    
    @SerializedName("deliveryAddressId")
    val deliveryAddressId: String,
    
    @SerializedName("paymentMethod")
    val paymentMethod: String, // "upi", "card", "netbanking", "cod", "wallet"
    
    @SerializedName("promoCode")
    val promoCode: String? = null
)

data class OrderItem(
    @SerializedName("productId")
    val productId: String,
    
    @SerializedName("quantity")
    val quantity: Int
)

/**
 * Cancel order request
 */
data class CancelOrderRequest(
    @SerializedName("reason")
    val reason: String
)

/**
 * Validate promotion request
 */
data class ValidatePromotionRequest(
    @SerializedName("code")
    val code: String,
    
    @SerializedName("orderAmount")
    val orderAmount: Double
)
