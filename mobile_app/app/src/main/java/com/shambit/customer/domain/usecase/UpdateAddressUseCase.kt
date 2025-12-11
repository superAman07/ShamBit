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
 * Use case for updating an existing address with validation
 * 
 * This use case handles the complete flow of updating an address:
 * 1. Validates all provided input fields
 * 2. Handles default address switching logic
 * 3. Preserves default status when not explicitly changed
 * 4. Updates cache after successful update
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
class UpdateAddressUseCase @Inject constructor(
    private val addressRepository: AddressRepository,
    private val addressCache: AddressCache
) {
    
    /**
     * Update an existing address with validation
     * 
     * @param id ID of the address to update
     * @param name Full name for the address (optional)
     * @param phoneNumber Phone number (optional, must be 10 digits if provided)
     * @param houseStreetArea House/Street/Area details (optional)
     * @param city City name (optional)
     * @param pincode Pincode (optional, must be 6 digits if provided)
     * @param type Address type (optional)
     * @param isDefault Whether to set as default address (optional)
     * @return NetworkResult containing the updated address or validation/network errors
     */
    suspend operator fun invoke(
        id: String,
        name: String? = null,
        phoneNumber: String? = null,
        houseStreetArea: String? = null,
        city: String? = null,
        pincode: String? = null,
        type: AddressType? = null,
        isDefault: Boolean? = null
    ): NetworkResult<Address> {
        
        // Validate provided input fields
        val validationResult = AddressValidator.validateAddressForUpdate(
            name = name?.trim(),
            phoneNumber = phoneNumber?.trim(),
            houseStreetArea = houseStreetArea?.trim(),
            city = city?.trim(),
            pincode = pincode?.trim()
        )
        
        if (validationResult is ValidationResult.Invalid) {
            return NetworkResult.Error(
                message = "Validation failed: ${validationResult.errors.values.joinToString(", ")}",
                code = "VALIDATION_ERROR"
            )
        }
        
        try {
            // Get existing addresses from cache to find the current address
            val existingAddresses = addressCache.getCachedAddresses() ?: emptyList()
            val currentAddress = existingAddresses.find { it.id == id }
                ?: return NetworkResult.Error("Address not found", "ADDRESS_NOT_FOUND")
            
            // Create updated address object with only changed fields
            val updatedAddress = currentAddress.copy(
                name = name?.trim() ?: currentAddress.name,
                phoneNumber = phoneNumber?.trim() ?: currentAddress.phoneNumber,
                houseStreetArea = houseStreetArea?.trim() ?: currentAddress.houseStreetArea,
                city = city?.trim() ?: currentAddress.city,
                pincode = pincode?.trim() ?: currentAddress.pincode,
                type = type ?: currentAddress.type,
                isDefault = isDefault ?: currentAddress.isDefault
            )
            
            // Update address via repository
            return when (val result = addressRepository.updateAddress(id, updatedAddress)) {
                is NetworkResult.Success -> {
                    // Update cache with the updated address
                    val updatedAddresses = existingAddresses.toMutableList()
                    
                    // If this address is set as default, remove default from others
                    if (result.data.isDefault && !currentAddress.isDefault) {
                        updatedAddresses.replaceAll { address ->
                            if (address.id != id && address.isDefault) {
                                address.copy(isDefault = false)
                            } else {
                                address
                            }
                        }
                    }
                    
                    // Replace the updated address
                    val index = updatedAddresses.indexOfFirst { it.id == id }
                    if (index != -1) {
                        updatedAddresses[index] = result.data
                    }
                    
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
            return NetworkResult.Error("Failed to update address: ${e.message}")
        }
    }
}