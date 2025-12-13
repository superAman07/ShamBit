package com.shambit.customer.data.remote.api

import com.shambit.customer.data.remote.dto.ApiResponse
import com.shambit.customer.data.remote.dto.response.BrandDto
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.remote.dto.response.ProductListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Product API endpoints
 */
interface ProductApi {
    
    /**
     * Get all products with filters
     * GET /products
     */
    @GET("products")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("categoryId") categoryId: String? = null,
        @Query("brandId") brandId: String? = null,
        @Query("search") search: String? = null,
        @Query("minPrice") minPrice: Double? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("isFeatured") isFeatured: Boolean? = null,
        @Query("tags") tags: String? = null
    ): Response<com.shambit.customer.data.remote.dto.response.ProductApiResponse>
    
    /**
     * Get product by ID
     * GET /products/:id
     */
    @GET("products/{id}")
    suspend fun getProductById(
        @Path("id") productId: String
    ): Response<ApiResponse<ProductDto>>
    
    /**
     * Search products
     * GET /products (using search parameter)
     * Note: Using /products endpoint instead of /products/search because the search endpoint
     * has strict type validation that doesn't work well with Retrofit query parameters
     */
    @GET("products")
    suspend fun searchProducts(
        @Query("search") query: String,
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20
    ): Response<com.shambit.customer.data.remote.dto.response.ProductApiResponse>
    
    /**
     * Get all categories
     * GET /categories
     */
    @GET("categories")
    suspend fun getCategories(
        @Query("parentId") parentId: String? = null
    ): Response<ApiResponse<List<CategoryDto>>>
    
    /**
     * Get featured categories
     * GET /categories/featured
     */
    @GET("categories/featured")
    suspend fun getFeaturedCategories(): Response<ApiResponse<List<CategoryDto>>>
    
    /**
     * Get category by ID
     * GET /categories/:id
     */
    @GET("categories/{id}")
    suspend fun getCategoryById(
        @Path("id") categoryId: String
    ): Response<ApiResponse<CategoryDto>>
    
    /**
     * Get all brands
     * GET /brands
     */
    @GET("brands")
    suspend fun getBrands(): Response<ApiResponse<List<BrandDto>>>
    
    /**
     * Get brand by ID
     * GET /brands/:id
     */
    @GET("brands/{id}")
    suspend fun getBrandById(
        @Path("id") brandId: String
    ): Response<ApiResponse<BrandDto>>
    
    /**
     * Get subcategories for a category
     * GET /categories/:categoryId/subcategories
     */
    @GET("categories/{categoryId}/subcategories")
    suspend fun getSubcategories(
        @Path("categoryId") categoryId: String
    ): Response<ApiResponse<List<com.shambit.customer.data.remote.dto.response.SubcategoryDto>>>
    
    /**
     * Get product feed with cursor pagination and filtering
     * GET /products/feed
     */
    @GET("products/feed")
    suspend fun getProductFeed(
        @Query("subcategoryId") subcategoryId: String? = null,
        @Query("cursor") cursor: String? = null,
        @Query("pageSize") pageSize: Int = 20,
        @Query("sortBy") sortBy: String = "relevance",
        @Query("filters") filters: Map<String, @JvmSuppressWildcards Any> = emptyMap()
    ): Response<ApiResponse<com.shambit.customer.data.remote.dto.response.ProductFeedResponse>>
    
    /**
     * Get filter options for dynamic filter configuration
     * GET /products/filters
     */
    @GET("products/filters")
    suspend fun getFilterOptions(
        @Query("subcategoryId") subcategoryId: String? = null
    ): Response<ApiResponse<List<com.shambit.customer.data.remote.dto.response.FilterOption>>>
}
