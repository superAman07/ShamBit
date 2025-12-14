package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.ProductApi
import com.shambit.customer.data.remote.dto.response.AppliedFilterValue
import com.shambit.customer.data.remote.dto.response.BrandDto
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.FilterOption
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.remote.dto.response.ProductFeedResponse
import com.shambit.customer.data.remote.dto.response.ProductListResponse
import com.shambit.customer.data.remote.dto.response.SortOption
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import com.shambit.customer.data.remote.dto.response.toApiValue
import com.shambit.customer.util.Constants
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for product operations
 */
@Singleton
class ProductRepository @Inject constructor(
    private val productApi: ProductApi
) {
    
    /**
     * Get products with filters
     */
    suspend fun getProducts(
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE,
        categoryId: String? = null,
        brandId: String? = null,
        search: String? = null,
        minPrice: Double? = null,
        maxPrice: Double? = null,
        isFeatured: Boolean? = null,
        tags: String? = null
    ): NetworkResult<ProductListResponse> {
        return try {
            val response = productApi.getProducts(
                page = page,
                pageSize = pageSize,
                categoryId = categoryId,
                brandId = brandId,
                search = search,
                minPrice = minPrice,
                maxPrice = maxPrice,
                isFeatured = isFeatured,
                tags = tags
            )
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.success) {
                    NetworkResult.Success(body.toProductListResponse())
                } else {
                    NetworkResult.Error(
                        message = body?.error?.message ?: "Unknown error occurred",
                        code = body?.error?.code
                    )
                }
            } else {
                NetworkResult.Error(
                    message = response.message() ?: "An error occurred",
                    code = response.code().toString()
                )
            }
        } catch (e: Exception) {
            NetworkResult.Error(
                message = e.message ?: "Network error occurred"
            )
        }
    }
    
    /**
     * Get product by ID
     */
    suspend fun getProductById(productId: String): NetworkResult<ProductDto> {
        return safeApiCall {
            productApi.getProductById(productId)
        }
    }
    
    /**
     * Search products
     */
    suspend fun searchProducts(
        query: String,
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE
    ): NetworkResult<ProductListResponse> {
        return try {
            val response = productApi.searchProducts(
                query = query,
                page = page,
                pageSize = pageSize
            )
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.success) {
                    NetworkResult.Success(body.toProductListResponse())
                } else {
                    NetworkResult.Error(
                        message = body?.error?.message ?: "Unknown error occurred",
                        code = body?.error?.code
                    )
                }
            } else {
                NetworkResult.Error(
                    message = response.message() ?: "An error occurred",
                    code = response.code().toString()
                )
            }
        } catch (e: Exception) {
            NetworkResult.Error(
                message = e.message ?: "Network error occurred"
            )
        }
    }
    
    /**
     * Get all categories
     */
    suspend fun getCategories(parentId: String? = null): NetworkResult<List<CategoryDto>> {
        return safeApiCall {
            productApi.getCategories(parentId)
        }
    }
    
    /**
     * Get category by ID
     */
    suspend fun getCategoryById(categoryId: String): NetworkResult<CategoryDto> {
        return safeApiCall {
            productApi.getCategoryById(categoryId)
        }
    }
    
    /**
     * Get all brands
     */
    suspend fun getBrands(): NetworkResult<List<BrandDto>> {
        return safeApiCall {
            productApi.getBrands()
        }
    }
    
    /**
     * Get brand by ID
     */
    suspend fun getBrandById(brandId: String): NetworkResult<BrandDto> {
        return safeApiCall {
            productApi.getBrandById(brandId)
        }
    }
    
    /**
     * Get featured products
     */
    suspend fun getFeaturedProducts(
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE
    ): NetworkResult<ProductListResponse> {
        return getProducts(
            page = page,
            pageSize = pageSize,
            isFeatured = true
        )
    }
    
    /**
     * Get products by category
     */
    suspend fun getProductsByCategory(
        categoryId: String,
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE
    ): NetworkResult<ProductListResponse> {
        return getProducts(
            page = page,
            pageSize = pageSize,
            categoryId = categoryId
        )
    }
    
    /**
     * Get products by brand
     */
    suspend fun getProductsByBrand(
        brandId: String,
        page: Int = Constants.INITIAL_PAGE,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE
    ): NetworkResult<ProductListResponse> {
        return getProducts(
            page = page,
            pageSize = pageSize,
            brandId = brandId
        )
    }
    
    /**
     * Get featured categories
     */
    suspend fun getFeaturedCategories(): NetworkResult<List<CategoryDto>> {
        return safeApiCall {
            productApi.getFeaturedCategories()
        }
    }
    
    /**
     * Get subcategories for a category
     */
    suspend fun getSubcategories(categoryId: String): NetworkResult<List<SubcategoryDto>> {
        android.util.Log.d("ProductRepository", "Getting subcategories for categoryId: $categoryId")
        val result = safeApiCall {
            productApi.getSubcategories(categoryId)
        }
        android.util.Log.d("ProductRepository", "Subcategories result: $result")
        return result
    }
    
    /**
     * Get product feed with cursor pagination and filtering support
     * Enhanced with proper network connectivity handling (Requirements: 11.4, 11.5)
     */
    suspend fun getProductFeed(
        subcategoryId: String? = null,
        cursor: String? = null,
        pageSize: Int = Constants.DEFAULT_PAGE_SIZE,
        sortBy: SortOption = SortOption.RELEVANCE,
        filters: Map<String, AppliedFilterValue> = emptyMap()
    ): NetworkResult<ProductFeedResponse> {
        return safeApiCall {
            val apiFilters = convertFiltersForApi(filters)
            productApi.getProductFeed(
                subcategoryId = subcategoryId,
                cursor = cursor,
                pageSize = pageSize,
                sortBy = sortBy.apiValue,
                filters = apiFilters
            )
        }
    }
    
    /**
     * Get filter options for dynamic filter configuration
     */
    suspend fun getFilterOptions(subcategoryId: String? = null): NetworkResult<List<FilterOption>> {
        return safeApiCall {
            productApi.getFilterOptions(subcategoryId)
        }
    }
    
    /**
     * Convert type-safe filters to API-friendly format
     */
    private fun convertFiltersForApi(filters: Map<String, AppliedFilterValue>): Map<String, Any> {
        return filters.mapValues { (_, filterValue) ->
            filterValue.toApiValue()
        }
    }
}
