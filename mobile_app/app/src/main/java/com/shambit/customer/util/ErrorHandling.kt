package com.shambit.customer.util

import android.content.Context
import com.shambit.customer.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Enhanced error handling utilities for address management
 * 
 * Provides standardized error handling, user-friendly messages,
 * and retry mechanisms for network operations.
 * 
 * Requirements: 3.5, 7.6, 11.3
 */

/**
 * Sealed class representing different types of errors
 */
sealed class AppError {
    data class NetworkError(val message: String, val isRetryable: Boolean = true) : AppError()
    data class ValidationError(val field: String, val message: String) : AppError()
    data class ApiError(val code: Int, val message: String, val isRetryable: Boolean = false) : AppError()
    data class UnknownError(val message: String, val isRetryable: Boolean = true) : AppError()
    data class ConcurrentModificationError(val message: String) : AppError()
    data class AddressLockError(val message: String, val isRetryable: Boolean = true) : AppError()
    data class ConstraintViolationError(val message: String, val constraintType: String, val isRetryable: Boolean = false) : AppError()
}

/**
 * Error state with retry capability
 */
data class ErrorState(
    val error: AppError? = null,
    val isRetrying: Boolean = false,
    val retryCount: Int = 0,
    val maxRetries: Int = 3
) {
    val canRetry: Boolean
        get() = error?.let { 
            when (it) {
                is AppError.NetworkError -> it.isRetryable && retryCount < maxRetries
                is AppError.ApiError -> it.isRetryable && retryCount < maxRetries
                is AppError.UnknownError -> it.isRetryable && retryCount < maxRetries
                is AppError.AddressLockError -> it.isRetryable && retryCount < maxRetries
                is AppError.ValidationError -> false
                is AppError.ConcurrentModificationError -> retryCount < maxRetries
                is AppError.ConstraintViolationError -> it.isRetryable && retryCount < maxRetries
            }
        } ?: false
}

/**
 * Loading state with operation context
 */
data class LoadingState(
    val isLoading: Boolean = false,
    val operation: String? = null,
    val progress: Float? = null
)

/**
 * Toast message with type and duration
 */
data class ToastMessage(
    val message: String,
    val type: ToastType = ToastType.INFO,
    val duration: ToastDuration = ToastDuration.SHORT,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null
)

enum class ToastType {
    SUCCESS, ERROR, WARNING, INFO
}

enum class ToastDuration {
    SHORT, LONG, INDEFINITE
}

/**
 * Error handler utility class
 */
object ErrorHandler {
    
    /**
     * Convert NetworkResult.Error to user-friendly AppError
     */
    fun handleNetworkError(error: String, context: Context): AppError {
        return when {
            error.contains("network", ignoreCase = true) ||
            error.contains("connection", ignoreCase = true) -> {
                AppError.NetworkError(
                    message = context.getString(R.string.error_network_connection),
                    isRetryable = true
                )
            }
            error.contains("timeout", ignoreCase = true) -> {
                AppError.NetworkError(
                    message = context.getString(R.string.error_request_timeout),
                    isRetryable = true
                )
            }
            error.contains("server", ignoreCase = true) ||
            error.contains("500", ignoreCase = true) -> {
                AppError.ApiError(
                    code = 500,
                    message = context.getString(R.string.error_server_error),
                    isRetryable = true
                )
            }
            error.contains("unauthorized", ignoreCase = true) ||
            error.contains("401", ignoreCase = true) -> {
                AppError.ApiError(
                    code = 401,
                    message = context.getString(R.string.error_unauthorized),
                    isRetryable = false
                )
            }
            error.contains("ADDRESS_NOT_FOUND", ignoreCase = true) ||
            error.contains("Address not found", ignoreCase = true) -> {
                AppError.ApiError(
                    code = 404,
                    message = "This address no longer exists. Your address list will be refreshed.",
                    isRetryable = false
                )
            }
            error.contains("not found", ignoreCase = true) ||
            error.contains("404", ignoreCase = true) -> {
                AppError.ApiError(
                    code = 404,
                    message = context.getString(R.string.error_not_found),
                    isRetryable = false
                )
            }
            error.contains("DATABASE_CONSTRAINT_VIOLATION", ignoreCase = true) ||
            error.contains("constraint", ignoreCase = true) -> {
                val constraintType = when {
                    error.contains("orders_delivery_address_id_foreign", ignoreCase = true) -> "order_history"
                    else -> "unknown"
                }
                AppError.ConstraintViolationError(
                    message = "This address cannot be deleted because it's linked to your order history. You can edit it instead.",
                    constraintType = constraintType,
                    isRetryable = false
                )
            }
            error.contains("conflict", ignoreCase = true) ||
            error.contains("409", ignoreCase = true) -> {
                AppError.ConcurrentModificationError(
                    message = context.getString(R.string.error_concurrent_modification)
                )
            }
            error.contains("address", ignoreCase = true) && 
            error.contains("lock", ignoreCase = true) -> {
                AppError.AddressLockError(
                    message = context.getString(R.string.error_address_lock_failed),
                    isRetryable = true
                )
            }
            else -> {
                AppError.UnknownError(
                    message = error.ifBlank { context.getString(R.string.error_unknown) },
                    isRetryable = true
                )
            }
        }
    }
    
    /**
     * Get user-friendly error message
     */
    fun getErrorMessage(error: AppError): String {
        return when (error) {
            is AppError.NetworkError -> error.message
            is AppError.ValidationError -> error.message
            is AppError.ApiError -> error.message
            is AppError.UnknownError -> error.message
            is AppError.ConcurrentModificationError -> error.message
            is AppError.AddressLockError -> error.message
            is AppError.ConstraintViolationError -> error.message
        }
    }
    
    /**
     * Create success toast message
     */
    fun createSuccessToast(message: String): ToastMessage {
        return ToastMessage(
            message = message,
            type = ToastType.SUCCESS,
            duration = ToastDuration.SHORT
        )
    }
    
    /**
     * Create error toast message with retry option
     */
    fun createErrorToast(
        message: String, 
        canRetry: Boolean = false,
        onRetry: (() -> Unit)? = null
    ): ToastMessage {
        return ToastMessage(
            message = message,
            type = ToastType.ERROR,
            duration = if (canRetry) ToastDuration.INDEFINITE else ToastDuration.LONG,
            actionLabel = if (canRetry) "Retry" else null,
            onAction = onRetry
        )
    }
    
    /**
     * Create warning toast message
     */
    fun createWarningToast(message: String): ToastMessage {
        return ToastMessage(
            message = message,
            type = ToastType.WARNING,
            duration = ToastDuration.SHORT
        )
    }
}

/**
 * Enhanced error state manager for ViewModels
 */
class ErrorStateManager {
    private val _errorState = MutableStateFlow(ErrorState())
    val errorState: StateFlow<ErrorState> = _errorState.asStateFlow()
    
    private val _loadingState = MutableStateFlow(LoadingState())
    val loadingState: StateFlow<LoadingState> = _loadingState.asStateFlow()
    
    private val _toastMessage = MutableStateFlow<ToastMessage?>(null)
    val toastMessage: StateFlow<ToastMessage?> = _toastMessage.asStateFlow()
    
    /**
     * Set loading state with operation context
     */
    fun setLoading(isLoading: Boolean, operation: String? = null, progress: Float? = null) {
        _loadingState.value = LoadingState(isLoading, operation, progress)
    }
    
    /**
     * Set error state
     */
    fun setError(error: AppError) {
        _errorState.value = _errorState.value.copy(
            error = error,
            isRetrying = false
        )
    }
    
    /**
     * Clear error state
     */
    fun clearError() {
        _errorState.value = ErrorState()
    }
    
    /**
     * Start retry operation
     */
    fun startRetry() {
        val currentState = _errorState.value
        if (currentState.canRetry) {
            _errorState.value = currentState.copy(
                isRetrying = true,
                retryCount = currentState.retryCount + 1
            )
        }
    }
    
    /**
     * Complete retry operation (success)
     */
    fun completeRetry() {
        _errorState.value = ErrorState()
    }
    
    /**
     * Fail retry operation
     */
    fun failRetry(error: AppError) {
        val currentState = _errorState.value
        _errorState.value = currentState.copy(
            error = error,
            isRetrying = false
        )
    }
    
    /**
     * Show toast message
     */
    fun showToast(message: ToastMessage) {
        _toastMessage.value = message
    }
    
    /**
     * Clear toast message
     */
    fun clearToast() {
        _toastMessage.value = null
    }
    
    /**
     * Check if currently loading
     */
    fun isLoading(): Boolean = _loadingState.value.isLoading
    
    /**
     * Check if has error
     */
    fun hasError(): Boolean = _errorState.value.error != null
    
    /**
     * Check if can retry
     */
    fun canRetry(): Boolean = _errorState.value.canRetry
}