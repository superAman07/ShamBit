package com.shambit.customer.di

import android.content.Context
import androidx.room.Room
import com.shambit.customer.data.local.database.AppDatabase
import com.shambit.customer.data.local.database.WishlistDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Database Module
 * Provides Room database and DAOs
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    /**
     * Provide App Database
     */
    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            AppDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration() // For development - remove in production
            .build()
    }
    
    /**
     * Provide Wishlist DAO
     */
    @Provides
    @Singleton
    fun provideWishlistDao(database: AppDatabase): WishlistDao {
        return database.wishlistDao()
    }
}
