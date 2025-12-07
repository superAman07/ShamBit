package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.PromotionDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Promotion API endpoints
 */
interface PromotionApi {
    
    /**
     * Get all active promotions
     * GET /product-offers/promotions
     */
    @GET("product-offers/promotions")
    suspend fun getActivePromotions(): Response<ApiResponse<List<PromotionDto>>>
    
    /**
     * Get promotion by ID
     * GET /product-offers/promotions/:id
     */
    @GET("product-offers/promotions/{id}")
    suspend fun getPromotionById(
        @Path("id") promotionId: String
    ): Response<ApiResponse<PromotionDto>>
    
    /**
     * Get promotions by type
     * GET /product-offers/promotions/type/:type
     */
    @GET("product-offers/promotions/type/{type}")
    suspend fun getPromotionsByType(
        @Path("type") type: String
    ): Response<ApiResponse<List<PromotionDto>>>
    
    /**
     * Get customer-specific promotions
     * GET /product-offers/promotions/customer
     */
    @GET("product-offers/promotions/customer")
    suspend fun getCustomerPromotions(): Response<ApiResponse<List<PromotionDto>>>
}
