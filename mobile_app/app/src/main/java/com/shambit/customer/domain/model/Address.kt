package com.shambit.customer.domain.model

/**
 * Domain model for delivery address
 * 
 * This model represents a delivery address in the domain layer,
 * separate from the API DTO representation.
 * 
 * Requirements: 1.1, 1.5, 1.6, 1.7
 */
data class Address(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val houseStreetArea: String,
    val city: String,
    val pincode: String,
    val type: AddressType,
    val isDefault: Boolean,
    val createdAt: String
) {
    /**
     * Convert address to full display string
     * Format: "Name, House/Street/Area, City - Pincode"
     */
    fun toDisplayString(): String {
        return "$name, $houseStreetArea, $city - $pincode"
    }
    
    /**
     * Convert address to short display string for home screen
     * Format: "Type - City"
     */
    fun toShortDisplayString(): String {
        return "${type.displayName} - $city"
    }
    
    /**
     * Convert address to checkout display string
     * Format: "Name, Phone, House/Street/Area, City - Pincode"
     */
    fun toCheckoutDisplayString(): String {
        return "$name, $phoneNumber\n$houseStreetArea\n$city - $pincode"
    }
}
