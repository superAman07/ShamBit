package com.shambit.customer.domain.validation

import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType

/**
 * Validator for address fields and complete address objects
 * 
 * Requirements: 1.1, 1.5, 1.6, 1.7
 */
object AddressValidator {
    
    /**
     * Validate name field
     * 
     * Requirements: 1.5
     * 
     * @param name The name to validate
     * @return ValidationResult indicating if the name is valid
     */
    fun validateName(name: String): ValidationResult {
        return when {
            name.isBlank() -> ValidationResult.Invalid(
                mapOf("name" to "Name is required")
            )
            else -> ValidationResult.Valid
        }
    }
    
    /**
     * Validate phone number field
     * Must be exactly 10 digits
     * 
     * Requirements: 1.6
     * 
     * @param phoneNumber The phone number to validate
     * @return ValidationResult indicating if the phone number is valid
     */
    fun validatePhoneNumber(phoneNumber: String): ValidationResult {
        val digitsOnly = phoneNumber.filter { it.isDigit() }
        return when {
            phoneNumber.isBlank() -> ValidationResult.Invalid(
                mapOf("phoneNumber" to "Phone number is required")
            )
            digitsOnly.length != 10 -> ValidationResult.Invalid(
                mapOf("phoneNumber" to "Phone number must be exactly 10 digits")
            )
            else -> ValidationResult.Valid
        }
    }
    
    /**
     * Validate house/street/area field
     * 
     * Requirements: 1.5
     * 
     * @param houseStreetArea The house/street/area to validate
     * @return ValidationResult indicating if the field is valid
     */
    fun validateHouseStreetArea(houseStreetArea: String): ValidationResult {
        return when {
            houseStreetArea.isBlank() -> ValidationResult.Invalid(
                mapOf("houseStreetArea" to "House/Street/Area is required")
            )
            else -> ValidationResult.Valid
        }
    }
    
    /**
     * Validate city field
     * 
     * Requirements: 1.5
     * 
     * @param city The city to validate
     * @return ValidationResult indicating if the city is valid
     */
    fun validateCity(city: String): ValidationResult {
        return when {
            city.isBlank() -> ValidationResult.Invalid(
                mapOf("city" to "City is required")
            )
            else -> ValidationResult.Valid
        }
    }
    
    /**
     * Validate pincode field
     * Must be exactly 6 digits
     * 
     * Requirements: 1.7
     * 
     * @param pincode The pincode to validate
     * @return ValidationResult indicating if the pincode is valid
     */
    fun validatePincode(pincode: String): ValidationResult {
        val digitsOnly = pincode.filter { it.isDigit() }
        return when {
            pincode.isBlank() -> ValidationResult.Invalid(
                mapOf("pincode" to "Pincode is required")
            )
            digitsOnly.length != 6 -> ValidationResult.Invalid(
                mapOf("pincode" to "Pincode must be exactly 6 digits")
            )
            else -> ValidationResult.Valid
        }
    }
    
    /**
     * Validate complete address for creation
     * Validates all required fields
     * 
     * Requirements: 1.1, 1.5, 1.6, 1.7
     * 
     * @param name The name
     * @param phoneNumber The phone number
     * @param houseStreetArea The house/street/area
     * @param city The city
     * @param pincode The pincode
     * @param type The address type
     * @return ValidationResult with all field-level errors if invalid
     */
    fun validateAddressForCreation(
        name: String,
        phoneNumber: String,
        houseStreetArea: String,
        city: String,
        pincode: String,
        type: AddressType
    ): ValidationResult {
        val errors = mutableMapOf<String, String>()
        
        // Validate name
        val nameResult = validateName(name)
        if (nameResult is ValidationResult.Invalid) {
            errors.putAll(nameResult.errors)
        }
        
        // Validate phone number
        val phoneResult = validatePhoneNumber(phoneNumber)
        if (phoneResult is ValidationResult.Invalid) {
            errors.putAll(phoneResult.errors)
        }
        
        // Validate house/street/area
        val houseStreetAreaResult = validateHouseStreetArea(houseStreetArea)
        if (houseStreetAreaResult is ValidationResult.Invalid) {
            errors.putAll(houseStreetAreaResult.errors)
        }
        
        // Validate city
        val cityResult = validateCity(city)
        if (cityResult is ValidationResult.Invalid) {
            errors.putAll(cityResult.errors)
        }
        
        // Validate pincode
        val pincodeResult = validatePincode(pincode)
        if (pincodeResult is ValidationResult.Invalid) {
            errors.putAll(pincodeResult.errors)
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.Valid
        } else {
            ValidationResult.Invalid(errors)
        }
    }
    
    /**
     * Validate complete address for update
     * Only validates fields that are provided (non-null)
     * 
     * Requirements: 2.1
     * 
     * @param name The name (optional)
     * @param phoneNumber The phone number (optional)
     * @param houseStreetArea The house/street/area (optional)
     * @param city The city (optional)
     * @param pincode The pincode (optional)
     * @return ValidationResult with all field-level errors if invalid
     */
    fun validateAddressForUpdate(
        name: String? = null,
        phoneNumber: String? = null,
        houseStreetArea: String? = null,
        city: String? = null,
        pincode: String? = null
    ): ValidationResult {
        val errors = mutableMapOf<String, String>()
        
        // Validate name if provided
        name?.let {
            val nameResult = validateName(it)
            if (nameResult is ValidationResult.Invalid) {
                errors.putAll(nameResult.errors)
            }
        }
        
        // Validate phone number if provided
        phoneNumber?.let {
            val phoneResult = validatePhoneNumber(it)
            if (phoneResult is ValidationResult.Invalid) {
                errors.putAll(phoneResult.errors)
            }
        }
        
        // Validate house/street/area if provided
        houseStreetArea?.let {
            val houseStreetAreaResult = validateHouseStreetArea(it)
            if (houseStreetAreaResult is ValidationResult.Invalid) {
                errors.putAll(houseStreetAreaResult.errors)
            }
        }
        
        // Validate city if provided
        city?.let {
            val cityResult = validateCity(it)
            if (cityResult is ValidationResult.Invalid) {
                errors.putAll(cityResult.errors)
            }
        }
        
        // Validate pincode if provided
        pincode?.let {
            val pincodeResult = validatePincode(it)
            if (pincodeResult is ValidationResult.Invalid) {
                errors.putAll(pincodeResult.errors)
            }
        }
        
        return if (errors.isEmpty()) {
            ValidationResult.Valid
        } else {
            ValidationResult.Invalid(errors)
        }
    }
}
