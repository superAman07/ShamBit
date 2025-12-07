package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Cart Summary DTO - matches backend CartSummary
 * This is what GET /cart returns
 */
data class CartDto(
    @SerializedName("items")
    val items: List<CartItemDto> = emptyList(),
    
    @SerializedName("subtotal")
    val subtotal: Double = 0.0,
    
    @SerializedName("discountAmount")
    val discountAmount: Double = 0.0,
    
    @SerializedName("taxAmount")
    val taxAmount: Double = 0.0,
    
    @SerializedName("deliveryFee")
    val deliveryFee: Double = 0.0,
    
    @SerializedName("totalAmount")
    val totalAmount: Double = 0.0,
    
    @SerializedName("promoCode")
    val promoCode: String? = null,
    
    @SerializedName("itemCount")
    val itemCount: Int = 0,
    
    @SerializedName("warnings")
    val warnings: List<String>? = null
)

/**
 * Cart Item DTO - matches backend CartItemWithProduct
 */
data class CartItemDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("productId")
    val productId: String,
    
    @SerializedName("quantity")
    val quantity: Int,
    
    @SerializedName("addedPrice")
    val addedPrice: Double,
    
    @SerializedName("product")
    val product: CartProductDto,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("updatedAt")
    val updatedAt: String
)

/**
 * Product info in cart item - simplified version
 */
data class CartProductDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("price")
    val price: Double,
    
    @SerializedName("imageUrls")
    val imageUrls: List<String> = emptyList(),
    
    @SerializedName("isActive")
    val isActive: Boolean = true,
    
    @SerializedName("stock")
    val stock: Int? = null
)
