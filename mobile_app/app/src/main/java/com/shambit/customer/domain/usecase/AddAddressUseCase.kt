package com.shambit.customer.domain.usecase

import com.shambit.customer.data.local.cache.AddressCache
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType
import com.shambit.customer.domain.repository.AddressRepository
import com.shambit.customer.domain.validation.AddressValidator
import com.shambit.customer.domain.validation.ValidationResult
import com.shambit.customer.util.NetworkResult
import javax.inject.Inject

/**
 * Use case for adding a new address with validation
 * 
 * This use case handles the complete flow of adding a new address:
 * 1. Validates all input fields
 * 2. Handles first address auto-default logic
 * 3. Handles default address switching logic
 * 4. Updates cache after successful creation
 * 
 * Requirements: 1.1, 1.2, 1.3
 */
class AddAddressUseCase @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    /**
     * Add a new address with validation
     * 
     * @param name Full name for the address
     * @param phoneNumber Phone number (must be 10 digits)
     * @param houseStreetArea House/Street/Area details
     * @param city City name
     * @param pincode Pincode (must be 6 digits)
     * @param type Address type (HOME, WORK, OTHER)
     * @param isDefault Whether to set as default address
     * @return NetworkResult containing the created address or validation/network errors
     */
    suspend operator fun invoke(
        name: String,
        phoneNumber: String,
        houseStreetArea: String,
        city: String,
        pincode: String,
        type: AddressType,
        isDefault: Boolean = false
    ): NetworkResult<Address> {
        
        // Validate all input fields
        val validationResult = AddressValidator.validateAddressForCreation(
            name = name.trim(),
            phoneNumber = phoneNumber.trim(),
            houseStreetArea = houseStreetArea.trim(),
            city = city.trim(),
            pincode = pincode.trim(),
            type = type
        )
        
        if (validationResult is ValidationResult.Invalid) {
            return NetworkResult.Error(
                message = "Validation failed: ${validationResult.errors.values.joinToString(", ")}",
                code = "VALIDATION_ERROR"
            )
        }
        
        try {
            // Check if this will be the first address (auto-default)
            val existingAddresses = addressCache.getCachedAddresses() ?: emptyList()
            val shouldBeDefault = isDefault || existingAddresses.isEmpty()
            
            // Create the address object
            val addressToAdd = Address(
                id = "", // Will be set by the server
                name = name.trim(),
                phoneNumber = phoneNumber.trim(),
                houseStreetArea = houseStreetArea.trim(),
                city = city.trim(),
                pincode = pincode.trim(),
                type = type,
                isDefault = shouldBeDefault,
                createdAt = "" // Will be set by the server
            )
            
            // Add address via repository
            return when (val result = addressRepository.addAddress(addressToAdd)) {
                is NetworkResult.Success -> {
                    // Update cache with the new address
                    val updatedAddresses = existingAddresses.toMutableList()
                    
                    // If this address is set as default, remove default from others
                    if (result.data.isDefault) {
                        updatedAddresses.replaceAll { address ->
                            if (address.isDefault) {
                                address.copy(isDefault = false)
                            } else {
                                address
                            }
                        }
                    }
                    
                    // Add the new address
                    updatedAddresses.add(result.data)
                    
                    // Update cache
                    addressCache.cacheAddresses(updatedAddresses)
                    
                    result
                }
                is NetworkResult.Error -> {
                    result
                }
                is NetworkResult.Loading -> {
                    result
                }
            }
        } catch (e: Exception) {
            return NetworkResult.Error("Failed to add address: ${e.message}")
        }
    }
}