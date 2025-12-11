package com.shambit.customer.data.mapper

import com.shambit.customer.data.remote.dto.request.AddAddressRequest
import com.shambit.customer.data.remote.dto.request.UpdateAddressRequest
import com.shambit.customer.data.remote.dto.response.AddressDto
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.model.AddressType

/**
 * Mapper functions to convert between Address DTOs and domain models
 * 
 * These functions handle the conversion between the API data transfer objects
 * and the domain models used throughout the application.
 * 
 * Requirements: 1.1, 2.1, 3.2, 3.3, 4.2
 */

/**
 * Convert AddressDto to Address domain model
 */
fun AddressDto.toDomainModel(): Address {
    return Address(
        id = id,
        name = name ?: "Unknown", // Handle null name with default value
        phoneNumber = phoneNumber ?: "", // Handle null phone number
        houseStreetArea = addressLine1 ?: "", // Handle null address line
        city = city ?: "", // Handle null city
        pincode = pincode ?: "", // Handle null pincode
        type = AddressType.fromApiValue(type ?: "other"), // Handle null type
        isDefault = isDefault,
        createdAt = createdAt ?: "" // Handle null createdAt
    )
}

/**
 * Convert Address domain model to AddAddressRequest
 */
fun Address.toAddRequest(): AddAddressRequest {
    return AddAddressRequest(
        name = name,
        phoneNumber = phoneNumber,
        type = type.apiValue,
        addressLine1 = houseStreetArea,
        addressLine2 = null,
        city = city,
        state = "", // Default empty state as it's not used in domain model
        pincode = pincode,
        landmark = null,
        latitude = null,
        longitude = null,
        isDefault = isDefault
    )
}

/**
 * Convert Address domain model to UpdateAddressRequest
 */
fun Address.toUpdateRequest(): UpdateAddressRequest {
    return UpdateAddressRequest(
        name = name,
        phoneNumber = phoneNumber,
        type = type.apiValue,
        addressLine1 = houseStreetArea,
        addressLine2 = null,
        city = city,
        state = "", // Default empty state as it's not used in domain model
        pincode = pincode,
        landmark = null,
        latitude = null,
        longitude = null,
        isDefault = isDefault
    )
}

/**
 * Convert list of AddressDto to list of Address domain models
 */
fun List<AddressDto>.toDomainModels(): List<Address> {
    return map { it.toDomainModel() }
}