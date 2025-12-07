package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.WishlistDto
import retrofit2.Response
import retrofit2.http.*

/**
 * Wishlist API Interface
 * Handles wishlist operations
 */
interface WishlistApi {
    
    /**
     * Get user's wishlist
     */
    @GET("wishlist")
    suspend fun getWishlist(): Response<ApiResponse<WishlistDto>>
    
    /**
     * Add item to wishlist
     */
    @POST("wishlist/items")
    suspend fun addToWishlist(
        @Body request: AddToWishlistRequest
    ): Response<ApiResponse<WishlistDto>>
    
    /**
     * Remove item from wishlist
     */
    @DELETE("wishlist/items/{productId}")
    suspend fun removeFromWishlist(
        @Path("productId") productId: String
    ): Response<ApiResponse<WishlistDto>>
    
    /**
     * Clear wishlist
     */
    @DELETE("wishlist")
    suspend fun clearWishlist(): Response<ApiResponse<Unit>>
}

/**
 * Add to wishlist request
 */
data class AddToWishlistRequest(
    val productId: String
)
