package com.shambit.customer.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * App Database
 * Main Room database for local storage
 */
@Database(
    entities = [
        WishlistEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    
    /**
     * Wishlist DAO
     */
    abstract fun wishlistDao(): WishlistDao
    
    companion object {
        const val DATABASE_NAME = "shambit_db"
    }
}
