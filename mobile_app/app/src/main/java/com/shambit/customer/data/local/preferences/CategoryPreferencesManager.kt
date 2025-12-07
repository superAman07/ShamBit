package com.shambit.customer.data.local.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Category tap frequency data
 */
data class CategoryTapData(
    val categoryId: String,
    val tapCount: Int,
    val lastTappedAt: Long
)

/**
 * Category Preferences Manager
 * Tracks category tap frequency for dynamic reordering
 */
@Singleton
class CategoryPreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val Context.categoryDataStore: DataStore<Preferences> by preferencesDataStore(
        name = "category_preferences"
    )
    
    private val gson = Gson()
    
    companion object {
        private val CATEGORY_TAP_DATA_KEY = stringPreferencesKey("category_tap_data")
        private val LAST_REORDER_TIME_KEY = longPreferencesKey("last_reorder_time")
        private const val REORDER_INTERVAL_MS = 24 * 60 * 60 * 1000L // 24 hours
    }
    
    /**
     * Track category tap
     */
    suspend fun trackCategoryTap(categoryId: String) {
        context.categoryDataStore.edit { preferences ->
            val currentData = getCategoryTapDataMap(preferences)
            val existingData = currentData[categoryId]
            
            val updatedData = if (existingData != null) {
                existingData.copy(
                    tapCount = existingData.tapCount + 1,
                    lastTappedAt = System.currentTimeMillis()
                )
            } else {
                CategoryTapData(
                    categoryId = categoryId,
                    tapCount = 1,
                    lastTappedAt = System.currentTimeMillis()
                )
            }
            
            currentData[categoryId] = updatedData
            preferences[CATEGORY_TAP_DATA_KEY] = gson.toJson(currentData)
        }
    }
    
    /**
     * Get category tap data
     */
    suspend fun getCategoryTapData(): Map<String, CategoryTapData> {
        val preferences = context.categoryDataStore.data.first()
        return getCategoryTapDataMap(preferences)
    }
    
    /**
     * Check if reordering is needed (24 hours since last reorder)
     */
    suspend fun shouldReorder(): Boolean {
        val preferences = context.categoryDataStore.data.first()
        val lastReorderTime = preferences[LAST_REORDER_TIME_KEY] ?: 0L
        val currentTime = System.currentTimeMillis()
        return (currentTime - lastReorderTime) >= REORDER_INTERVAL_MS
    }
    
    /**
     * Update last reorder time
     */
    suspend fun updateLastReorderTime() {
        context.categoryDataStore.edit { preferences ->
            preferences[LAST_REORDER_TIME_KEY] = System.currentTimeMillis()
        }
    }
    
    /**
     * Clear all category tap data
     */
    suspend fun clearCategoryTapData() {
        context.categoryDataStore.edit { preferences ->
            preferences.remove(CATEGORY_TAP_DATA_KEY)
            preferences.remove(LAST_REORDER_TIME_KEY)
        }
    }
    
    /**
     * Helper to get category tap data map from preferences
     */
    private fun getCategoryTapDataMap(preferences: Preferences): MutableMap<String, CategoryTapData> {
        val json = preferences[CATEGORY_TAP_DATA_KEY] ?: return mutableMapOf()
        return try {
            val type = object : TypeToken<MutableMap<String, CategoryTapData>>() {}.type
            gson.fromJson(json, type) ?: mutableMapOf()
        } catch (e: Exception) {
            mutableMapOf()
        }
    }
}
