package com.shambit.customer.domain.model

/**
 * Address type enum representing different types of delivery addresses
 */
enum class AddressType(val displayName: String, val apiValue: String) {
    HOME("Home", "home"),
    WORK("Work", "work"),
    OTHER("Other", "other");
    
    companion object {
        /**
         * Convert API string value to AddressType enum
         */
        fun fromApiValue(value: String): AddressType {
            return values().find { it.apiValue.equals(value, ignoreCase = true) } ?: OTHER
        }
    }
}
