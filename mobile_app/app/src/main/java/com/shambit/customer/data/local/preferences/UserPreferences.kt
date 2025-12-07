package com.shambit.customer.data.local.preferences

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DataStore for storing user preferences and tokens
 */
@Singleton
class UserPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    
    companion object {
        // Authentication keys
        private val ACCESS_TOKEN_KEY = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN_KEY = stringPreferencesKey("refresh_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_MOBILE_KEY = stringPreferencesKey("user_mobile")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
        private val FCM_TOKEN_KEY = stringPreferencesKey("fcm_token")
        
        // Cache keys
        private val CATEGORIES_CACHE_KEY = stringPreferencesKey("categories_cache")
        private val CATEGORIES_CACHE_TIME_KEY = longPreferencesKey("categories_cache_time")
        private val FEATURED_PRODUCTS_CACHE_KEY = stringPreferencesKey("featured_products_cache")
        private val FEATURED_PRODUCTS_CACHE_TIME_KEY = longPreferencesKey("featured_products_cache_time")
        private val BANNERS_CACHE_KEY = stringPreferencesKey("banners_cache")
        private val BANNERS_CACHE_TIME_KEY = longPreferencesKey("banners_cache_time")
        
        // Recent searches
        private val RECENT_SEARCHES_KEY = stringPreferencesKey("recent_searches")
        private const val MAX_RECENT_SEARCHES = 10
        
        // Cache durations
        const val CATEGORIES_CACHE_DURATION = 3600000L // 1 hour
        const val FEATURED_PRODUCTS_CACHE_DURATION = 900000L // 15 minutes
        const val BANNERS_CACHE_DURATION = 300000L // 5 minutes
    }
    
    /**
     * Save authentication tokens
     */
    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        dataStore.edit { preferences ->
            preferences[ACCESS_TOKEN_KEY] = accessToken
            preferences[REFRESH_TOKEN_KEY] = refreshToken
        }
    }
    
    /**
     * Get access token
     */
    fun getAccessToken(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[ACCESS_TOKEN_KEY]
        }
    }
    
    /**
     * Get refresh token
     */
    fun getRefreshToken(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[REFRESH_TOKEN_KEY]
        }
    }
    
    /**
     * Save user info
     */
    suspend fun saveUserInfo(
        userId: String,
        name: String?,
        mobile: String,
        email: String?
    ) {
        dataStore.edit { preferences ->
            preferences[USER_ID_KEY] = userId
            if (name != null) preferences[USER_NAME_KEY] = name
            preferences[USER_MOBILE_KEY] = mobile
            if (email != null) preferences[USER_EMAIL_KEY] = email
        }
    }
    
    /**
     * Get user ID
     */
    fun getUserId(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[USER_ID_KEY]
        }
    }
    
    /**
     * Get user name
     */
    fun getUserName(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[USER_NAME_KEY]
        }
    }
    
    /**
     * Get user mobile
     */
    fun getUserMobile(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[USER_MOBILE_KEY]
        }
    }
    
    /**
     * Get user email
     */
    fun getUserEmail(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[USER_EMAIL_KEY]
        }
    }
    
    /**
     * Save FCM token
     */
    suspend fun saveFcmToken(token: String) {
        dataStore.edit { preferences ->
            preferences[FCM_TOKEN_KEY] = token
        }
    }
    
    /**
     * Get FCM token
     */
    fun getFcmToken(): Flow<String?> {
        return dataStore.data.map { preferences ->
            preferences[FCM_TOKEN_KEY]
        }
    }
    
    /**
     * Clear all user data (logout)
     */
    suspend fun clearAll() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }
    
    /**
     * Check if user is logged in
     */
    fun isLoggedIn(): Flow<Boolean> {
        return dataStore.data.map { preferences ->
            preferences[ACCESS_TOKEN_KEY] != null
        }
    }
    
    // ========== Cache Methods ==========
    
    /**
     * Save categories cache
     */
    suspend fun saveCategoriesCache(data: String) {
        dataStore.edit { preferences ->
            preferences[CATEGORIES_CACHE_KEY] = data
            preferences[CATEGORIES_CACHE_TIME_KEY] = System.currentTimeMillis()
        }
    }
    
    /**
     * Get categories cache
     */
    fun getCategoriesCache(): Flow<Pair<String?, Long>> {
        return dataStore.data.map { preferences ->
            Pair(
                preferences[CATEGORIES_CACHE_KEY],
                preferences[CATEGORIES_CACHE_TIME_KEY] ?: 0L
            )
        }
    }
    
    /**
     * Check if categories cache is valid
     */
    suspend fun isCategoriesCacheValid(): Boolean {
        var isValid = false
        dataStore.data.map { preferences ->
            val cacheTime = preferences[CATEGORIES_CACHE_TIME_KEY] ?: 0L
            val now = System.currentTimeMillis()
            isValid = (now - cacheTime) < CATEGORIES_CACHE_DURATION
        }.collect { }
        return isValid
    }
    
    /**
     * Save featured products cache
     */
    suspend fun saveFeaturedProductsCache(data: String) {
        dataStore.edit { preferences ->
            preferences[FEATURED_PRODUCTS_CACHE_KEY] = data
            preferences[FEATURED_PRODUCTS_CACHE_TIME_KEY] = System.currentTimeMillis()
        }
    }
    
    /**
     * Get featured products cache
     */
    fun getFeaturedProductsCache(): Flow<Pair<String?, Long>> {
        return dataStore.data.map { preferences ->
            Pair(
                preferences[FEATURED_PRODUCTS_CACHE_KEY],
                preferences[FEATURED_PRODUCTS_CACHE_TIME_KEY] ?: 0L
            )
        }
    }
    
    /**
     * Check if featured products cache is valid
     */
    suspend fun isFeaturedProductsCacheValid(): Boolean {
        var isValid = false
        dataStore.data.map { preferences ->
            val cacheTime = preferences[FEATURED_PRODUCTS_CACHE_TIME_KEY] ?: 0L
            val now = System.currentTimeMillis()
            isValid = (now - cacheTime) < FEATURED_PRODUCTS_CACHE_DURATION
        }.collect { }
        return isValid
    }
    
    /**
     * Save banners cache
     */
    suspend fun saveBannersCache(data: String) {
        dataStore.edit { preferences ->
            preferences[BANNERS_CACHE_KEY] = data
            preferences[BANNERS_CACHE_TIME_KEY] = System.currentTimeMillis()
        }
    }
    
    /**
     * Get banners cache
     */
    fun getBannersCache(): Flow<Pair<String?, Long>> {
        return dataStore.data.map { preferences ->
            Pair(
                preferences[BANNERS_CACHE_KEY],
                preferences[BANNERS_CACHE_TIME_KEY] ?: 0L
            )
        }
    }
    
    /**
     * Check if banners cache is valid
     */
    suspend fun isBannersCacheValid(): Boolean {
        var isValid = false
        dataStore.data.map { preferences ->
            val cacheTime = preferences[BANNERS_CACHE_TIME_KEY] ?: 0L
            val now = System.currentTimeMillis()
            isValid = (now - cacheTime) < BANNERS_CACHE_DURATION
        }.collect { }
        return isValid
    }
    
    /**
     * Clear all caches
     */
    suspend fun clearAllCaches() {
        dataStore.edit { preferences ->
            preferences.remove(CATEGORIES_CACHE_KEY)
            preferences.remove(CATEGORIES_CACHE_TIME_KEY)
            preferences.remove(FEATURED_PRODUCTS_CACHE_KEY)
            preferences.remove(FEATURED_PRODUCTS_CACHE_TIME_KEY)
            preferences.remove(BANNERS_CACHE_KEY)
            preferences.remove(BANNERS_CACHE_TIME_KEY)
        }
    }
    
    // ========== Recent Searches ==========
    
    /**
     * Get recent searches
     */
    val recentSearches: Flow<List<String>> = dataStore.data.map { preferences ->
        val searchesString = preferences[RECENT_SEARCHES_KEY] ?: ""
        if (searchesString.isBlank()) emptyList()
        else searchesString.split("|").filter { it.isNotBlank() }
    }
    
    /**
     * Add recent search
     */
    suspend fun addRecentSearch(query: String) {
        dataStore.edit { preferences ->
            val currentSearches = preferences[RECENT_SEARCHES_KEY]?.split("|")?.filter { it.isNotBlank() } ?: emptyList()
            val updatedSearches = (listOf(query) + currentSearches.filter { it != query }).take(MAX_RECENT_SEARCHES)
            preferences[RECENT_SEARCHES_KEY] = updatedSearches.joinToString("|")
        }
    }
    
    /**
     * Clear recent searches
     */
    suspend fun clearRecentSearches() {
        dataStore.edit { preferences ->
            preferences.remove(RECENT_SEARCHES_KEY)
        }
    }
}
