package com.shambit.customer.util

import kotlinx.coroutines.delay
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Enhanced Retry Handler for New API Endpoints
 * Extends existing retry mechanisms for new premium features
 * Requirements: 11.4, 11.5
 */
@Singleton
class EnhancedRetryHandler @Inject constructor(
    private val networkConnectivityManager: NetworkConnectivityManager
) {
    
    /**
     * Enhanced retry mechanism specifically for subcategory loading
     * Requirements: 10.5, 11.3
     */
    suspend fun <T> retrySubcategoryOperation(
        operation: suspend () -> NetworkResult<T>,
        maxRetries: Int = 3
    ): NetworkResult<T> {
        return retryWithNetworkAnalysis(
            operation = operation,
            maxRetries = maxRetries,
            operationType = "subcategory_loading"
        )
    }
    
    /**
     * Enhanced retry mechanism specifically for product feed loading
     * Requirements: 10.2, 11.1
     */
    suspend fun <T> retryProductFeedOperation(
        operation: suspend () -> NetworkResult<T>,
        maxRetries: Int = 3
    ): NetworkResult<T> {
        return retryWithNetworkAnalysis(
            operation = operation,
            maxRetries = maxRetries,
            operationType = "product_feed_loading"
        )
    }
    
    /**
     * Enhanced retry mechanism specifically for filter operations
     * Requirements: 10.2, 11.1
     */
    suspend fun <T> retryFilterOperation(
        operation: suspend () -> NetworkResult<T>,
        maxRetries: Int = 2 // Fewer retries for filter operations
    ): NetworkResult<T> {
        return retryWithNetworkAnalysis(
            operation = operation,
            maxRetries = maxRetries,
            operationType = "filter_operation"
        )
    }
    
    /**
     * Enhanced retry mechanism specifically for pagination operations
     * Requirements: 11.2, 4.3
     */
    suspend fun <T> retryPaginationOperation(
        operation: suspend () -> NetworkResult<T>,
        maxRetries: Int = 2 // Fewer retries for pagination to avoid blocking UI
    ): NetworkResult<T> {
        return retryWithNetworkAnalysis(
            operation = operation,
            maxRetries = maxRetries,
            operationType = "pagination_operation"
        )
    }
    
    /**
     * Core retry mechanism with network analysis
     */
    private suspend fun <T> retryWithNetworkAnalysis(
        operation: suspend () -> NetworkResult<T>,
        maxRetries: Int,
        operationType: String
    ): NetworkResult<T> {
        var retryCount = 0
        var lastError: NetworkResult.Error? = null
        
        while (retryCount <= maxRetries) {
            // Check network connectivity before each attempt
            if (!networkConnectivityManager.isNetworkAvailable() && retryCount > 0) {
                return NetworkResult.Error(
                    message = "No internet connection available",
                    code = "NO_INTERNET"
                )
            }
            
            when (val result = operation()) {
                is NetworkResult.Success -> {
                    return result
                }
                is NetworkResult.Error -> {
                    lastError = result
                    
                    // Analyze the error to determine if retry is worthwhile
                    val analysis = networkConnectivityManager.analyzeNetworkError(result)
                    
                    if (!shouldRetry(result, analysis, retryCount, maxRetries)) {
                        return result
                    }
                    
                    // Calculate delay based on error analysis
                    val delay = calculateRetryDelay(result, analysis, retryCount, operationType)
                    if (delay > 0) {
                        delay(delay)
                    }
                    
                    retryCount++
                }
                is NetworkResult.Loading -> {
                    // Continue to next iteration
                    retryCount++
                }
            }
        }
        
        // All retries exhausted
        return lastError ?: NetworkResult.Error(
            message = "Maximum retries exceeded",
            code = "MAX_RETRIES_EXCEEDED"
        )
    }
    
    /**
     * Determine if an error should be retried based on network analysis
     */
    private fun shouldRetry(
        error: NetworkResult.Error,
        analysis: NetworkErrorAnalysis,
        currentRetry: Int,
        maxRetries: Int
    ): Boolean {
        if (currentRetry >= maxRetries) return false
        
        return when (analysis.errorType) {
            NetworkErrorType.NO_CONNECTION -> {
                // Only retry if network becomes available
                networkConnectivityManager.isNetworkAvailable()
            }
            NetworkErrorType.NETWORK_ISSUE -> true
            NetworkErrorType.MALFORMED_RESPONSE -> true // Might be temporary
            NetworkErrorType.SERVER_ERROR -> true
            NetworkErrorType.RATE_LIMITED -> currentRetry < 2 // Limited retries for rate limiting
            NetworkErrorType.UNKNOWN -> currentRetry < 1 // Only one retry for unknown errors
        }
    }
    
    /**
     * Calculate retry delay based on error analysis and operation type
     */
    private fun calculateRetryDelay(
        error: NetworkResult.Error,
        analysis: NetworkErrorAnalysis,
        retryCount: Int,
        operationType: String
    ): Long {
        val baseDelay = when (operationType) {
            "subcategory_loading" -> 1000L // 1 second base delay
            "product_feed_loading" -> 1500L // 1.5 seconds base delay
            "filter_operation" -> 500L // 0.5 seconds base delay (faster for filters)
            "pagination_operation" -> 800L // 0.8 seconds base delay
            else -> 1000L
        }
        
        return when (analysis.errorType) {
            NetworkErrorType.NO_CONNECTION -> 2000L // Wait longer for connection
            NetworkErrorType.RATE_LIMITED -> 5000L + (retryCount * 2000L) // Exponential backoff for rate limiting
            NetworkErrorType.SERVER_ERROR -> baseDelay * (retryCount + 1) // Linear backoff for server errors
            NetworkErrorType.MALFORMED_RESPONSE -> baseDelay // Fixed delay for malformed responses
            NetworkErrorType.NETWORK_ISSUE -> baseDelay * (1 + retryCount) // Gradual increase
            NetworkErrorType.UNKNOWN -> baseDelay // Fixed delay for unknown errors
        }.coerceAtMost(10000L) // Max 10 seconds delay
    }
    
    /**
     * Check if operation should be retried based on network quality
     */
    fun shouldRetryBasedOnNetworkQuality(operationType: String): Boolean {
        val quality = networkConnectivityManager.getNetworkQuality()
        
        return when (quality) {
            NetworkQuality.NO_CONNECTION -> false
            NetworkQuality.LIMITED -> {
                // Only retry critical operations on limited connection
                operationType in listOf("subcategory_loading", "product_feed_loading")
            }
            NetworkQuality.FAIR -> true
            NetworkQuality.GOOD -> true
            NetworkQuality.EXCELLENT -> true
        }
    }
    
    /**
     * Get user-friendly retry message based on network analysis
     * Enhanced with context for string resources (Requirements: 11.4, 11.5)
     */
    fun getRetryMessage(analysis: NetworkErrorAnalysis, context: android.content.Context): String {
        return when (analysis.recommendedAction) {
            RecommendedAction.CHECK_CONNECTION -> context.getString(com.shambit.customer.R.string.error_check_connection)
            RecommendedAction.RETRY_IMMEDIATELY -> context.getString(com.shambit.customer.R.string.error_malformed_response)
            RecommendedAction.RETRY_WITH_BACKOFF -> context.getString(com.shambit.customer.R.string.error_server_temporarily_unavailable)
            RecommendedAction.WAIT_AND_RETRY -> context.getString(com.shambit.customer.R.string.error_too_many_requests)
            RecommendedAction.SUGGEST_WIFI -> context.getString(com.shambit.customer.R.string.error_suggest_wifi)
        }
    }
    
    /**
     * Get user-friendly retry message based on network analysis (backward compatibility)
     */
    fun getRetryMessage(analysis: NetworkErrorAnalysis): String {
        return when (analysis.recommendedAction) {
            RecommendedAction.CHECK_CONNECTION -> "Please check your internet connection and try again"
            RecommendedAction.RETRY_IMMEDIATELY -> "Something went wrong — tap to retry"
            RecommendedAction.RETRY_WITH_BACKOFF -> "Server temporarily unavailable — please wait a moment"
            RecommendedAction.WAIT_AND_RETRY -> "Too many requests — please wait before trying again"
            RecommendedAction.SUGGEST_WIFI -> "Consider connecting to Wi-Fi for better performance"
        }
    }
}