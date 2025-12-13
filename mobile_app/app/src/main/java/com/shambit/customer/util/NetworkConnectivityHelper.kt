package com.shambit.customer.util

/**
 * Network Connectivity Helper
 * Provides utility methods for network error analysis and retry logic
 * Requirements: 11.4, 11.5
 */
object NetworkConnectivityHelper {
    
    /**
     * Check if an error is network-related
     */
    fun isNetworkError(error: NetworkResult.Error): Boolean {
        return when {
            error.code in listOf("NETWORK_ERROR", "TIMEOUT", "CONNECTION_ERROR") -> true
            error.message?.contains("network", ignoreCase = true) == true -> true
            error.message?.contains("connection", ignoreCase = true) == true -> true
            error.message?.contains("timeout", ignoreCase = true) == true -> true
            error.code?.startsWith("HTTP_") == true -> false // HTTP errors are not network issues
            else -> false
        }
    }
    
    /**
     * Check if an error is due to malformed response
     */
    fun isMalformedResponseError(error: NetworkResult.Error): Boolean {
        return when {
            error.code in listOf("MALFORMED_RESPONSE", "PARSE_ERROR", "JSON_ERROR") -> true
            error.message?.contains("malformed", ignoreCase = true) == true -> true
            error.message?.contains("parse", ignoreCase = true) == true -> true
            error.message?.contains("json", ignoreCase = true) == true -> true
            error.message?.contains("unexpected", ignoreCase = true) == true -> true
            else -> false
        }
    }
    
    /**
     * Check if an error is retryable
     */
    fun isRetryableError(error: NetworkResult.Error): Boolean {
        return when {
            // Network errors are generally retryable
            isNetworkError(error) -> true
            // Malformed responses might be temporary
            isMalformedResponseError(error) -> true
            // Server errors are retryable
            error.code in listOf("500", "502", "503", "504") -> true
            // Rate limiting is retryable with delay
            error.code == "429" -> true
            // Client errors are generally not retryable
            error.code?.startsWith("4") == true && error.code != "429" -> false
            // Unknown errors get one retry chance
            else -> true
        }
    }
    
    /**
     * Get appropriate retry delay based on error type and retry count
     */
    fun getRetryDelay(error: NetworkResult.Error, retryCount: Int): Long {
        val baseDelay = when {
            error.code == "429" -> 5000L // Rate limiting - longer delay
            error.code in listOf("500", "502", "503", "504") -> 2000L // Server errors
            isNetworkError(error) -> 1500L // Network issues
            isMalformedResponseError(error) -> 1000L // Malformed responses
            else -> 1000L // Default delay
        }
        
        // Exponential backoff with jitter
        val exponentialDelay = baseDelay * (1 shl retryCount) // 2^retryCount
        val jitter = (Math.random() * 500).toLong() // Add up to 500ms jitter
        
        return (exponentialDelay + jitter).coerceAtMost(10000L) // Max 10 seconds
    }
    
    /**
     * Check if error indicates server is temporarily unavailable
     */
    fun isTemporaryServerError(error: NetworkResult.Error): Boolean {
        return error.code in listOf("500", "502", "503", "504", "429")
    }
    
    /**
     * Check if error indicates client-side issue (non-retryable)
     */
    fun isClientError(error: NetworkResult.Error): Boolean {
        return error.code?.startsWith("4") == true && error.code != "429"
    }
    
    /**
     * Get user-friendly error message based on error type
     */
    fun getUserFriendlyMessage(error: NetworkResult.Error): String {
        return when {
            isNetworkError(error) -> "Please check your internet connection and try again"
            isMalformedResponseError(error) -> "Something went wrong — tap to retry"
            error.code == "429" -> "Too many requests — please wait before trying again"
            error.code in listOf("500", "502", "503", "504") -> "Server temporarily unavailable — please wait a moment"
            isClientError(error) -> "Request failed — please check your input"
            else -> "Something went wrong — tap to retry"
        }
    }
    
    /**
     * Determine if operation should be retried based on network conditions
     */
    fun shouldRetryOperation(
        error: NetworkResult.Error,
        retryCount: Int,
        maxRetries: Int,
        isNetworkAvailable: Boolean
    ): Boolean {
        if (retryCount >= maxRetries) return false
        if (!isNetworkAvailable && isNetworkError(error)) return false
        
        return isRetryableError(error)
    }
    
    /**
     * Get recommended action for handling the error
     */
    fun getRecommendedAction(error: NetworkResult.Error, isNetworkAvailable: Boolean): RecommendedAction {
        return when {
            !isNetworkAvailable -> RecommendedAction.CHECK_CONNECTION
            isMalformedResponseError(error) -> RecommendedAction.RETRY_IMMEDIATELY
            error.code == "429" -> RecommendedAction.WAIT_AND_RETRY
            error.code in listOf("500", "502", "503", "504") -> RecommendedAction.RETRY_WITH_BACKOFF
            isClientError(error) -> RecommendedAction.CHECK_CONNECTION // Don't retry client errors
            else -> RecommendedAction.RETRY_IMMEDIATELY
        }
    }
}