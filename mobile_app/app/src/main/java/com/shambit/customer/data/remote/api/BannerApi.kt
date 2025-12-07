package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.BannerDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Banner API endpoints
 */
interface BannerApi {
    
    /**
     * Get hero banners
     * GET /product-offers/banners/hero
     */
    @GET("product-offers/banners/hero")
    suspend fun getHeroBanners(): Response<ApiResponse<List<BannerDto>>>
    
    /**
     * Get promotional banners
     * GET /product-offers/banners/promotional
     */
    @GET("product-offers/banners/promotional")
    suspend fun getPromotionalBanners(): Response<ApiResponse<List<BannerDto>>>
    
    /**
     * Get category banners
     * GET /product-offers/banners/category
     */
    @GET("product-offers/banners/category")
    suspend fun getCategoryBanners(): Response<ApiResponse<List<BannerDto>>>
    
    /**
     * Get product banners
     * GET /product-offers/banners/product
     */
    @GET("product-offers/banners/product")
    suspend fun getProductBanners(): Response<ApiResponse<List<BannerDto>>>
    
    /**
     * Get all active banners
     * GET /product-offers/banners
     */
    @GET("product-offers/banners")
    suspend fun getAllBanners(
        @Query("bannerType") bannerType: String? = null
    ): Response<ApiResponse<List<BannerDto>>>
    
    /**
     * Get banner by ID
     * GET /product-offers/banners/:id
     */
    @GET("product-offers/banners/{id}")
    suspend fun getBannerById(
        @Path("id") bannerId: String
    ): Response<ApiResponse<BannerDto>>
}
