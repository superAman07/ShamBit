package com.shambit.customer.data.local.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

/**
 * Wishlist DAO - Data Access Object for wishlist operations
 */
@Dao
interface WishlistDao {
    
    /**
     * Get all wishlist items ordered by most recently added
     */
    @Query("SELECT * FROM wishlist ORDER BY added_at DESC")
    fun getAllItems(): Flow<List<WishlistEntity>>
    
    /**
     * Get wishlist item by product ID
     */
    @Query("SELECT * FROM wishlist WHERE product_id = :productId")
    suspend fun getItem(productId: String): WishlistEntity?
    
    /**
     * Check if product is in wishlist
     */
    @Query("SELECT EXISTS(SELECT 1 FROM wishlist WHERE product_id = :productId)")
    suspend fun isInWishlist(productId: String): Boolean
    
    /**
     * Check if product is in wishlist (Flow for reactive updates)
     */
    @Query("SELECT EXISTS(SELECT 1 FROM wishlist WHERE product_id = :productId)")
    fun isInWishlistFlow(productId: String): Flow<Boolean>
    
    /**
     * Get wishlist count
     */
    @Query("SELECT COUNT(*) FROM wishlist")
    fun getCount(): Flow<Int>
    
    /**
     * Add item to wishlist
     * OnConflict REPLACE will update if already exists
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addItem(item: WishlistEntity)
    
    /**
     * Add multiple items to wishlist
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun addItems(items: List<WishlistEntity>)
    
    /**
     * Remove item from wishlist
     */
    @Delete
    suspend fun removeItem(item: WishlistEntity)
    
    /**
     * Remove item by product ID
     */
    @Query("DELETE FROM wishlist WHERE product_id = :productId")
    suspend fun removeItemById(productId: String)
    
    /**
     * Clear entire wishlist
     */
    @Query("DELETE FROM wishlist")
    suspend fun clearWishlist()
    
    /**
     * Update item availability
     */
    @Query("UPDATE wishlist SET is_available = :isAvailable WHERE product_id = :productId")
    suspend fun updateAvailability(productId: String, isAvailable: Boolean)
    
    /**
     * Update item stock
     */
    @Query("UPDATE wishlist SET stock = :stock WHERE product_id = :productId")
    suspend fun updateStock(productId: String, stock: Int)
}
