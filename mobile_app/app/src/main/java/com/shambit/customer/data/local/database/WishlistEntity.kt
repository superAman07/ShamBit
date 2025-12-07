package com.shambit.customer.data.local.database

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Wishlist Entity for Room Database
 * Stores user's wishlist items locally
 */
@Entity(tableName = "wishlist")
data class WishlistEntity(
    @PrimaryKey
    @ColumnInfo(name = "product_id")
    val productId: String,
    
    @ColumnInfo(name = "name")
    val name: String,
    
    @ColumnInfo(name = "price")
    val price: Double,
    
    @ColumnInfo(name = "mrp")
    val mrp: Double? = null,
    
    @ColumnInfo(name = "image_url")
    val imageUrl: String? = null,
    
    @ColumnInfo(name = "brand")
    val brand: String? = null,
    
    @ColumnInfo(name = "category")
    val category: String? = null,
    
    @ColumnInfo(name = "is_available")
    val isAvailable: Boolean = true,
    
    @ColumnInfo(name = "stock")
    val stock: Int? = null,
    
    @ColumnInfo(name = "added_at")
    val addedAt: Long = System.currentTimeMillis()
)
