package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Product DTO
 */
data class ProductDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("categoryId")
    val categoryId: String,
    
    @SerializedName("brandId")
    val brandId: String? = null,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("slug")
    val slug: String,
    
    @SerializedName("sku")
    val sku: String? = null,
    
    @SerializedName("barcode")
    val barcode: String? = null,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("detailedDescription")
    val detailedDescription: String? = null,
    
    @SerializedName("brand")
    val brand: String? = null,
    
    @SerializedName("unitSize")
    val unitSize: String? = null,
    
    @SerializedName("unitType")
    val unitType: String? = null,
    
    @SerializedName("mrp")
    val mrp: Double,
    
    @SerializedName("sellingPrice")
    val sellingPrice: Double,
    
    @SerializedName("taxPercent")
    val taxPercent: Double = 0.0,
    
    @SerializedName("discountPercent")
    val discountPercent: Double = 0.0,
    
    @SerializedName("weight")
    val weight: String? = null,
    
    @SerializedName("dimensions")
    val dimensions: String? = null,
    
    @SerializedName("storageInfo")
    val storageInfo: String? = null,
    
    @SerializedName("ingredients")
    val ingredients: String? = null,
    
    @SerializedName("nutritionInfo")
    val nutritionInfo: String? = null,
    
    @SerializedName("shelfLifeDays")
    val shelfLifeDays: Int? = null,
    
    @SerializedName("searchKeywords")
    val searchKeywords: String? = null,
    
    @SerializedName("tags")
    val tags: String? = null,
    
    @SerializedName("isFeatured")
    val isFeatured: Boolean = false,
    
    @SerializedName("isReturnable")
    val isReturnable: Boolean = true,
    
    @SerializedName("isSellable")
    val isSellable: Boolean = true,
    
    @SerializedName("imageUrls")
    val imageUrls: List<String> = emptyList(),
    
    @SerializedName("images")
    val images: List<ProductImageDto>? = null,
    
    @SerializedName("attributes")
    val attributes: List<ProductAttributeDto>? = null,
    
    @SerializedName("activeOffers")
    val activeOffers: List<ProductOfferDto>? = null,
    
    @SerializedName("finalPrice")
    val finalPrice: Double? = null,
    
    @SerializedName("brandName")
    val brandName: String? = null,
    
    @SerializedName("brandLogoUrl")
    val brandLogoUrl: String? = null,
    
    @SerializedName("isActive")
    val isActive: Boolean = true,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("updatedAt")
    val updatedAt: String,
    
    @SerializedName("category")
    val category: CategoryDto? = null,
    
    @SerializedName("brandDto")
    val brandDto: BrandDto? = null,
    
    // Stock information
    @SerializedName("stockQuantity")
    val stockQuantity: Int = 0,
    
    @SerializedName("isAvailable")
    val isAvailable: Boolean = false,
    
    // Rating information
    @SerializedName("averageRating")
    val averageRating: Double? = null,
    
    @SerializedName("reviewCount")
    val reviewCount: Int? = null,
    
    // Product badges
    @SerializedName("badges")
    val badges: List<String>? = null,
    
    // Delivery information
    @SerializedName("deliveryTime")
    val deliveryTime: String? = null,
    
    @SerializedName("deliveryMinutes")
    val deliveryMinutes: Int? = null
) {
    /**
     * Calculate discount percentage
     */
    fun getDiscountPercentage(): Int {
        return if (mrp > sellingPrice) {
            ((mrp - sellingPrice) / mrp * 100).toInt()
        } else {
            0
        }
    }
    
    /**
     * Check if product has discount
     */
    fun hasDiscount(): Boolean = mrp > sellingPrice
    
    /**
     * Get first image URL with full path
     * Converts relative URLs to absolute URLs
     */
    fun getFirstImageUrl(): String? {
        val relativeUrl = imageUrls.firstOrNull()
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(relativeUrl)
    }
    
    /**
     * Get all image URLs with full paths
     * Converts relative URLs to absolute URLs
     */
    fun getAllImageUrls(): List<String> {
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrls(imageUrls)
    }
    
    /**
     * Check if product is out of stock
     */
    fun isOutOfStock(): Boolean = stockQuantity <= 0
    
    /**
     * Check if product is low stock
     */
    fun isLowStock(): Boolean = stockQuantity in 1..4
}

data class ProductImageDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("imageUrl")
    val imageUrl: String,
    
    @SerializedName("altText")
    val altText: String? = null,
    
    @SerializedName("displayOrder")
    val displayOrder: Int,
    
    @SerializedName("isPrimary")
    val isPrimary: Boolean
)

data class ProductAttributeDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("attributeName")
    val attributeName: String,
    
    @SerializedName("attributeValue")
    val attributeValue: String
)

data class ProductOfferDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("offerTitle")
    val offerTitle: String,
    
    @SerializedName("offerDescription")
    val offerDescription: String? = null,
    
    @SerializedName("discountType")
    val discountType: String, // "Percentage" or "Fixed"
    
    @SerializedName("discountValue")
    val discountValue: Double,
    
    @SerializedName("startDate")
    val startDate: String,
    
    @SerializedName("endDate")
    val endDate: String,
    
    @SerializedName("bannerUrl")
    val bannerUrl: String? = null
)

/**
 * Product list response
 */
data class ProductListResponse(
    @SerializedName("products")
    val products: List<ProductDto>,
    
    @SerializedName("pagination")
    val pagination: com.shambit.customer.data.remote.dto.Pagination
)

/**
 * Category DTO
 */
data class CategoryDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("slug")
    val slug: String,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("imageUrl")
    val imageUrl: String? = null,
    
    @SerializedName("bannerUrl")
    val bannerUrl: String? = null,
    
    @SerializedName("iconUrl")
    val iconUrl: String? = null,
    
    @SerializedName("parentId")
    val parentId: String? = null,
    
    @SerializedName("isFeatured")
    val isFeatured: Boolean = false,
    
    @SerializedName("displayOrder")
    val displayOrder: Int = 0,
    
    @SerializedName("isActive")
    val isActive: Boolean = true,
    
    @SerializedName("productCount")
    val productCount: Int = 0,
    
    @SerializedName("subcategories")
    val subcategories: List<CategoryDto>? = null,
    
    @SerializedName("metaTitle")
    val metaTitle: String? = null,
    
    @SerializedName("metaDescription")
    val metaDescription: String? = null
) {
    /**
     * Get full icon URL (with fallback to imageUrl)
     * Converts relative URLs to absolute URLs
     */
    fun getFullIconUrl(): String? {
        val relativeUrl = iconUrl ?: imageUrl
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(relativeUrl)
    }
    
    /**
     * Get full image URL
     * Converts relative URLs to absolute URLs
     */
    fun getFullImageUrl(): String? {
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(imageUrl)
    }
    
    /**
     * Get full banner URL
     * Converts relative URLs to absolute URLs
     */
    fun getFullBannerUrl(): String? {
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(bannerUrl)
    }
}

/**
 * Brand DTO
 */
data class BrandDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("slug")
    val slug: String,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("logoUrl")
    val logoUrl: String? = null,
    
    @SerializedName("country")
    val country: String? = null,
    
    @SerializedName("isActive")
    val isActive: Boolean = true
)


/**
 * Product API Response wrapper
 * Matches the actual API structure where products are returned as array in data field
 * and pagination is at the root level alongside data
 */
data class ProductApiResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("data")
    val data: List<ProductDto>,
    
    @SerializedName("pagination")
    val pagination: com.shambit.customer.data.remote.dto.Pagination,
    
    @SerializedName("error")
    val error: com.shambit.customer.data.remote.dto.ApiError? = null
) {
    /**
     * Convert to ProductListResponse for compatibility
     */
    fun toProductListResponse(): ProductListResponse {
        return ProductListResponse(
            products = data,
            pagination = pagination
        )
    }
}
