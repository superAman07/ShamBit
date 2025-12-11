package com.shambit.customer.domain.validation

/**
 * Sealed class representing the result of a validation operation
 * 
 * Requirements: 1.5
 */
sealed class ValidationResult {
    /**
     * Validation passed successfully
     */
    object Valid : ValidationResult()
    
    /**
     * Validation failed with field-level errors
     * 
     * @param errors Map of field names to error messages
     */
    data class Invalid(val errors: Map<String, String>) : ValidationResult() {
        /**
         * Check if a specific field has an error
         */
        fun hasError(field: String): Boolean = errors.containsKey(field)
        
        /**
         * Get error message for a specific field
         */
        fun getError(field: String): String? = errors[field]
    }
    
    /**
     * Check if validation result is valid
     */
    fun isValid(): Boolean = this is Valid
    
    /**
     * Check if validation result is invalid
     */
    fun isInvalid(): Boolean = this is Invalid
}
