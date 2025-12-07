package com.shambit.customer.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.shambit.customer.data.local.preferences.PreferencesManager
import com.shambit.customer.data.local.preferences.UserPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

// Extension property for DataStore
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "shambit_preferences")

/**
 * Hilt module for providing app-level dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    /**
     * Provide DataStore
     */
    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }
    
    /**
     * Provide UserPreferences
     */
    @Provides
    @Singleton
    fun provideUserPreferences(dataStore: DataStore<Preferences>): UserPreferences {
        return UserPreferences(dataStore)
    }
    
    /**
     * Provide PreferencesManager
     */
    @Provides
    @Singleton
    fun providePreferencesManager(
        userPreferences: UserPreferences,
        gson: Gson
    ): PreferencesManager {
        return PreferencesManager(userPreferences, gson)
    }
}
