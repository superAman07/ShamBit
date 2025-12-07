package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.CartDto
import retrofit2.Response
import retrofit2.http.*

/**
 * Cart API Interface
 * Handles cart operations
 */
interface CartApi {
    
    /**
     * Get user's cart
     */
    @GET("cart")
    suspend fun getCart(): Response<ApiResponse<CartDto>>
    
    /**
     * Add item to cart
     */
    @POST("cart/items")
    suspend fun addToCart(
        @Body request: AddToCartRequest
    ): Response<ApiResponse<CartDto>>
    
    /**
     * Update cart item quantity
     */
    @PUT("cart/items/{itemId}")
    suspend fun updateCartItem(
        @Path("itemId") itemId: String,
        @Body request: UpdateCartItemRequest
    ): Response<ApiResponse<CartDto>>
    
    /**
     * Remove item from cart
     */
    @DELETE("cart/items/{itemId}")
    suspend fun removeFromCart(
        @Path("itemId") itemId: String
    ): Response<ApiResponse<CartDto>>
    
    /**
     * Clear cart
     */
    @DELETE("cart")
    suspend fun clearCart(): Response<ApiResponse<Unit>>
}

/**
 * Add to cart request
 */
data class AddToCartRequest(
    val productId: String,
    val quantity: Int = 1
)

/**
 * Update cart item request
 */
data class UpdateCartItemRequest(
    val quantity: Int
)
