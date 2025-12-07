package com.shambit.customer.data.local.preferences

import com.google.gson.Gson
import com.shambit.customer.data.remote.dto.response.BannerDto
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manager for handling cached data with DataStore
 */
@Singleton
class PreferencesManager @Inject constructor(
    private val userPreferences: UserPreferences,
    private val gson: Gson
) {
    
    /**
     * Save categories to cache
     */
    suspend fun saveCategoriesCache(categories: List<CategoryDto>) {
        val json = gson.toJson(categories)
        userPreferences.saveCategoriesCache(json)
    }
    
    /**
     * Get categories from cache
     */
    suspend fun getCategoriesCache(): List<CategoryDto>? {
        val (json, cacheTime) = userPreferences.getCategoriesCache().first()
        
        if (json == null) return null
        
        val now = System.currentTimeMillis()
        if ((now - cacheTime) > UserPreferences.CATEGORIES_CACHE_DURATION) {
            return null // Cache expired
        }
        
        return try {
            gson.fromJson(json, Array<CategoryDto>::class.java).toList()
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Save featured products to cache
     */
    suspend fun saveFeaturedProductsCache(products: List<ProductDto>) {
        val json = gson.toJson(products)
        userPreferences.saveFeaturedProductsCache(json)
    }
    
    /**
     * Get featured products from cache
     */
    suspend fun getFeaturedProductsCache(): List<ProductDto>? {
        val (json, cacheTime) = userPreferences.getFeaturedProductsCache().first()
        
        if (json == null) return null
        
        val now = System.currentTimeMillis()
        if ((now - cacheTime) > UserPreferences.FEATURED_PRODUCTS_CACHE_DURATION) {
            return null // Cache expired
        }
        
        return try {
            gson.fromJson(json, Array<ProductDto>::class.java).toList()
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Save banners to cache
     */
    suspend fun saveBannersCache(banners: List<BannerDto>) {
        val json = gson.toJson(banners)
        userPreferences.saveBannersCache(json)
    }
    
    /**
     * Get banners from cache
     */
    suspend fun getBannersCache(): List<BannerDto>? {
        val (json, cacheTime) = userPreferences.getBannersCache().first()
        
        if (json == null) return null
        
        val now = System.currentTimeMillis()
        if ((now - cacheTime) > UserPreferences.BANNERS_CACHE_DURATION) {
            return null // Cache expired
        }
        
        return try {
            gson.fromJson(json, Array<BannerDto>::class.java).toList()
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Clear all caches
     */
    suspend fun clearAllCaches() {
        userPreferences.clearAllCaches()
    }
}
