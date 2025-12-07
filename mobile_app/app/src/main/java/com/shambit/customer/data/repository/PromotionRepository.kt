package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.PromotionApi
import com.shambit.customer.data.remote.dto.response.PromotionDto
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.safeApiCall
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for promotion operations with validation
 */
@Singleton
class PromotionRepository @Inject constructor(
    private val promotionApi: PromotionApi
) {
    
    /**
     * Get all active promotions
     */
    suspend fun getActivePromotions(): NetworkResult<List<PromotionDto>> {
        return when (val result = safeApiCall { promotionApi.getActivePromotions() }) {
            is NetworkResult.Success -> {
                // Filter only valid promotions
                val validPromotions = result.data.filter { it.isValid() }
                NetworkResult.Success(validPromotions)
            }
            else -> result
        }
    }
    
    /**
     * Get promotion by ID
     */
    suspend fun getPromotionById(promotionId: String): NetworkResult<PromotionDto> {
        return safeApiCall {
            promotionApi.getPromotionById(promotionId)
        }
    }
    
    /**
     * Get promotions by type
     */
    suspend fun getPromotionsByType(type: String): NetworkResult<List<PromotionDto>> {
        return when (val result = safeApiCall { promotionApi.getPromotionsByType(type) }) {
            is NetworkResult.Success -> {
                val validPromotions = result.data.filter { it.isValid() }
                NetworkResult.Success(validPromotions)
            }
            else -> result
        }
    }
    
    /**
     * Get customer-specific promotions
     */
    suspend fun getCustomerPromotions(): NetworkResult<List<PromotionDto>> {
        return when (val result = safeApiCall { promotionApi.getCustomerPromotions() }) {
            is NetworkResult.Success -> {
                val validPromotions = result.data.filter { it.isValid() }
                NetworkResult.Success(validPromotions)
            }
            else -> result
        }
    }
    
    /**
     * Validate promotion for given amount
     */
    fun validatePromotion(promotion: PromotionDto, amount: Double): Boolean {
        return promotion.isValid() && 
               (promotion.minPurchaseAmount == null || amount >= promotion.minPurchaseAmount)
    }
    
    /**
     * Calculate best promotion for given amount
     */
    fun calculateBestPromotion(promotions: List<PromotionDto>, amount: Double): PromotionDto? {
        return promotions
            .filter { validatePromotion(it, amount) }
            .maxByOrNull { it.calculateDiscount(amount) }
    }
}
