package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.BannerApi
import com.shambit.customer.data.remote.dto.response.BannerDto
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for banner operations with caching logic
 */
@Singleton
class BannerRepository @Inject constructor(
    private val bannerApi: BannerApi
) {
    // In-memory cache
    private var heroBannersCache: List<BannerDto>? = null
    private var heroBannersCacheTime: Long = 0
    
    private var promotionalBannersCache: List<BannerDto>? = null
    private var promotionalBannersCacheTime: Long = 0
    
    private var categoryBannersCache: List<BannerDto>? = null
    private var categoryBannersCacheTime: Long = 0
    
    private var productBannersCache: List<BannerDto>? = null
    private var productBannersCacheTime: Long = 0
    
    companion object {
        private const val CACHE_DURATION = 300000L // 5 minutes in milliseconds
    }
    
    /**
     * Get hero banners with caching
     */
    suspend fun getHeroBanners(forceRefresh: Boolean = false): NetworkResult<List<BannerDto>> {
        val now = System.currentTimeMillis()
        
        // Return cached data if valid and not forcing refresh
        if (!forceRefresh && heroBannersCache != null && (now - heroBannersCacheTime) < CACHE_DURATION) {
            return NetworkResult.Success(heroBannersCache!!)
        }
        
        // Fetch from API
        return when (val result = safeApiCall { bannerApi.getHeroBanners() }) {
            is NetworkResult.Success -> {
                heroBannersCache = result.data
                heroBannersCacheTime = now
                result
            }
            else -> result
        }
    }
    
    /**
     * Get promotional banners with caching
     */
    suspend fun getPromotionalBanners(forceRefresh: Boolean = false): NetworkResult<List<BannerDto>> {
        val now = System.currentTimeMillis()
        
        if (!forceRefresh && promotionalBannersCache != null && (now - promotionalBannersCacheTime) < CACHE_DURATION) {
            return NetworkResult.Success(promotionalBannersCache!!)
        }
        
        return when (val result = safeApiCall { bannerApi.getPromotionalBanners() }) {
            is NetworkResult.Success -> {
                promotionalBannersCache = result.data
                promotionalBannersCacheTime = now
                result
            }
            else -> result
        }
    }
    
    /**
     * Get category banners with caching
     */
    suspend fun getCategoryBanners(forceRefresh: Boolean = false): NetworkResult<List<BannerDto>> {
        val now = System.currentTimeMillis()
        
        if (!forceRefresh && categoryBannersCache != null && (now - categoryBannersCacheTime) < CACHE_DURATION) {
            return NetworkResult.Success(categoryBannersCache!!)
        }
        
        return when (val result = safeApiCall { bannerApi.getCategoryBanners() }) {
            is NetworkResult.Success -> {
                categoryBannersCache = result.data
                categoryBannersCacheTime = now
                result
            }
            else -> result
        }
    }
    
    /**
     * Get product banners with caching
     */
    suspend fun getProductBanners(forceRefresh: Boolean = false): NetworkResult<List<BannerDto>> {
        val now = System.currentTimeMillis()
        
        if (!forceRefresh && productBannersCache != null && (now - productBannersCacheTime) < CACHE_DURATION) {
            return NetworkResult.Success(productBannersCache!!)
        }
        
        return when (val result = safeApiCall { bannerApi.getProductBanners() }) {
            is NetworkResult.Success -> {
                productBannersCache = result.data
                productBannersCacheTime = now
                result
            }
            else -> result
        }
    }
    
    /**
     * Get all banners
     */
    suspend fun getAllBanners(bannerType: String? = null): NetworkResult<List<BannerDto>> {
        return safeApiCall {
            bannerApi.getAllBanners(bannerType)
        }
    }
    
    /**
     * Get banner by ID
     */
    suspend fun getBannerById(bannerId: String): NetworkResult<BannerDto> {
        return safeApiCall {
            bannerApi.getBannerById(bannerId)
        }
    }
    
    /**
     * Clear all caches
     */
    fun clearCache() {
        heroBannersCache = null
        heroBannersCacheTime = 0
        promotionalBannersCache = null
        promotionalBannersCacheTime = 0
        categoryBannersCache = null
        categoryBannersCacheTime = 0
        productBannersCache = null
        productBannersCacheTime = 0
    }
}
