package com.shambit.customer.presentation.home

/**
 * Sealed class representing the state of data loading operations
 * Used for composite UI state where each section can have independent loading states
 */
sealed class DataState<out T> {
    /**
     * Loading state - data is being fetched
     */
    object Loading : DataState<Nothing>()
    
    /**
     * Success state - data has been loaded successfully
     * @param data The loaded data
     */
    data class Success<T>(val data: T) : DataState<T>()
    
    /**
     * Error state - data loading failed
     * @param message Error message describing what went wrong
     */
    data class Error(val message: String) : DataState<Nothing>()
    
    /**
     * Get the data if this is a Success state, null otherwise
     * @return The data if Success, null otherwise
     */
    fun getDataOrNull(): T? = (this as? Success)?.data
    
    /**
     * Check if this is a Success state
     * @return true if Success, false otherwise
     */
    fun isSuccess(): Boolean = this is Success
    
    /**
     * Check if this is an Error state
     * @return true if Error, false otherwise
     */
    fun isError(): Boolean = this is Error
    
    /**
     * Check if this is a Loading state
     * @return true if Loading, false otherwise
     */
    fun isLoading(): Boolean = this is Loading
}
