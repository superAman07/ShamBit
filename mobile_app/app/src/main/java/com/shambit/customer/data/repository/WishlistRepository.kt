package com.shambit.customer.data.repository

import com.shambit.customer.data.local.database.WishlistDao
import com.shambit.customer.data.local.database.WishlistEntity
import com.shambit.customer.data.remote.dto.response.ProductDto
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Wishlist Repository
 * Handles wishlist operations using local Room database
 * No backend API needed for MVP - stored locally
 */
@Singleton
class WishlistRepository @Inject constructor(
    private val wishlistDao: WishlistDao
) {
    
    /**
     * Get all wishlist items as Flow
     */
    fun getWishlistItems(): Flow<List<WishlistEntity>> {
        return wishlistDao.getAllItems()
    }
    
    /**
     * Get wishlist count as Flow
     */
    fun getWishlistCount(): Flow<Int> {
        return wishlistDao.getCount()
    }
    
    /**
     * Check if product is in wishlist
     */
    suspend fun isInWishlist(productId: String): Boolean {
        return wishlistDao.isInWishlist(productId)
    }
    
    /**
     * Check if product is in wishlist (Flow for reactive updates)
     */
    fun isInWishlistFlow(productId: String): Flow<Boolean> {
        return wishlistDao.isInWishlistFlow(productId)
    }
    
    /**
     * Add product to wishlist
     */
    suspend fun addToWishlist(product: ProductDto) {
        val wishlistItem = WishlistEntity(
            productId = product.id,
            name = product.name,
            price = product.sellingPrice,
            mrp = product.mrp,
            imageUrl = product.imageUrls.firstOrNull(),
            brand = product.brandName,
            category = product.category?.name,
            isAvailable = product.isActive && product.isSellable,
            stock = product.stockQuantity,
            addedAt = System.currentTimeMillis()
        )
        wishlistDao.addItem(wishlistItem)
    }
    
    /**
     * Remove product from wishlist
     */
    suspend fun removeFromWishlist(productId: String) {
        wishlistDao.removeItemById(productId)
    }
    
    /**
     * Toggle wishlist status for a product
     * Returns true if added, false if removed
     */
    suspend fun toggleWishlist(product: ProductDto): Boolean {
        return if (isInWishlist(product.id)) {
            removeFromWishlist(product.id)
            false
        } else {
            addToWishlist(product)
            true
        }
    }
    
    /**
     * Clear entire wishlist
     */
    suspend fun clearWishlist() {
        wishlistDao.clearWishlist()
    }
    
    /**
     * Update product availability in wishlist
     */
    suspend fun updateAvailability(productId: String, isAvailable: Boolean) {
        wishlistDao.updateAvailability(productId, isAvailable)
    }
    
    /**
     * Update product stock in wishlist
     */
    suspend fun updateStock(productId: String, stock: Int) {
        wishlistDao.updateStock(productId, stock)
    }
    
    /**
     * Get wishlist item by product ID
     */
    suspend fun getWishlistItem(productId: String): WishlistEntity? {
        return wishlistDao.getItem(productId)
    }
}
