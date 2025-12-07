package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Banner DTO
 * Maps to ProductOffer from backend API
 */
data class BannerDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("offerTitle")
    val title: String,
    
    @SerializedName("offerDescription")
    val description: String? = null,
    
    @SerializedName("bannerUrl")
    val imageUrl: String,
    
    @SerializedName("mobileImageUrl")
    val mobileImageUrl: String? = null,
    
    @SerializedName("bannerType")
    val bannerType: String, // 'hero', 'promotional', 'category', 'product'
    
    @SerializedName("actionType")
    val actionType: String, // 'product', 'category', 'url', 'search', 'none'
    
    @SerializedName("actionValue")
    val actionValue: String? = null,
    
    @SerializedName("backgroundColor")
    val backgroundColor: String? = null,
    
    @SerializedName("textColor")
    val textColor: String? = null,
    
    @SerializedName("displayOrder")
    val displayOrder: Int = 0,
    
    @SerializedName("startDate")
    val startDate: String,
    
    @SerializedName("endDate")
    val endDate: String,
    
    @SerializedName("isActive")
    val isActive: Boolean = true,
    
    @SerializedName("createdAt")
    val createdAt: String? = null,
    
    @SerializedName("updatedAt")
    val updatedAt: String? = null
) {
    /**
     * Get mobile-optimized image URL
     * Converts relative URLs to absolute URLs
     */
    fun getMobileImage(): String {
        val relativeUrl = mobileImageUrl ?: imageUrl
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(relativeUrl) ?: ""
    }
    
    /**
     * Get desktop image URL
     * Converts relative URLs to absolute URLs
     */
    fun getDesktopImage(): String {
        return com.shambit.customer.util.ImageUrlHelper.getAbsoluteUrl(imageUrl) ?: ""
    }
}
