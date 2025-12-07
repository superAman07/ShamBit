package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Wishlist DTO
 */
data class WishlistDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("items")
    val items: List<WishlistItemDto>,
    
    @SerializedName("itemCount")
    val itemCount: Int,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("updatedAt")
    val updatedAt: String
)

/**
 * Wishlist Item DTO
 */
data class WishlistItemDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("productId")
    val productId: String,
    
    @SerializedName("product")
    val product: ProductDto,
    
    @SerializedName("createdAt")
    val createdAt: String
)
