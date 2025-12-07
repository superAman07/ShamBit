package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Promotion DTO
 */
data class PromotionDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("description")
    val description: String? = null,
    
    @SerializedName("promotionType")
    val promotionType: String, // 'percentage', 'fixed', 'bogo', 'bundle'
    
    @SerializedName("discountValue")
    val discountValue: Double,
    
    @SerializedName("minPurchaseAmount")
    val minPurchaseAmount: Double? = null,
    
    @SerializedName("maxDiscountAmount")
    val maxDiscountAmount: Double? = null,
    
    @SerializedName("applicableProducts")
    val applicableProducts: List<String>? = null,
    
    @SerializedName("applicableCategories")
    val applicableCategories: List<String>? = null,
    
    @SerializedName("startDate")
    val startDate: String,
    
    @SerializedName("endDate")
    val endDate: String,
    
    @SerializedName("isActive")
    val isActive: Boolean = true,
    
    @SerializedName("usageLimit")
    val usageLimit: Int? = null,
    
    @SerializedName("usageCount")
    val usageCount: Int = 0,
    
    @SerializedName("bannerUrl")
    val bannerUrl: String? = null,
    
    @SerializedName("termsAndConditions")
    val termsAndConditions: String? = null,
    
    @SerializedName("createdAt")
    val createdAt: String? = null,
    
    @SerializedName("updatedAt")
    val updatedAt: String? = null
) {
    /**
     * Check if promotion is valid
     */
    fun isValid(): Boolean {
        return isActive && (usageLimit == null || usageCount < usageLimit)
    }
    
    /**
     * Calculate discount for given amount
     */
    fun calculateDiscount(amount: Double): Double {
        if (!isValid() || (minPurchaseAmount != null && amount < minPurchaseAmount)) {
            return 0.0
        }
        
        val discount = when (promotionType.lowercase()) {
            "percentage" -> amount * (discountValue / 100.0)
            "fixed" -> discountValue
            else -> 0.0
        }
        
        return if (maxDiscountAmount != null) {
            minOf(discount, maxDiscountAmount)
        } else {
            discount
        }
    }
}
