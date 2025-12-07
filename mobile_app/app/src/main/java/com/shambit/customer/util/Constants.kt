package com.shambit.customer.util

/**
 * App-wide constants
 */
object Constants {
    
    // API
    const val API_TIMEOUT = 30L // seconds
    
    // Pagination
    const val DEFAULT_PAGE_SIZE = 20
    const val INITIAL_PAGE = 1
    
    // Order Status
    object OrderStatus {
        const val PENDING = "pending"
        const val PAYMENT_PROCESSING = "payment_processing"
        const val CONFIRMED = "confirmed"
        const val PREPARING = "preparing"
        const val OUT_FOR_DELIVERY = "out_for_delivery"
        const val DELIVERED = "delivered"
        const val CANCELED = "canceled"
        const val RETURNED = "returned"
        const val FAILED = "failed"
    }
    
    // Payment Status
    object PaymentStatus {
        const val PENDING = "pending"
        const val COMPLETED = "completed"
        const val FAILED = "failed"
        const val REFUNDED = "refunded"
    }
    
    // Payment Methods
    object PaymentMethod {
        const val UPI = "upi"
        const val CARD = "card"
        const val NET_BANKING = "netbanking"
        const val COD = "cod"
        const val WALLET = "wallet"
    }
    
    // Address Types
    object AddressType {
        const val HOME = "home"
        const val WORK = "work"
        const val OTHER = "other"
    }
    
    // Delivery Status
    object DeliveryStatus {
        const val ASSIGNED = "assigned"
        const val PICKED_UP = "picked_up"
        const val IN_TRANSIT = "in_transit"
        const val DELIVERED = "delivered"
        const val FAILED = "failed"
    }
    
    // Notification Types
    object NotificationType {
        const val ORDER_CONFIRMED = "order_confirmed"
        const val ORDER_PREPARING = "order_preparing"
        const val ORDER_OUT_FOR_DELIVERY = "order_out_for_delivery"
        const val ORDER_DELIVERED = "order_delivered"
        const val ORDER_CANCELED = "order_canceled"
        const val PAYMENT_SUCCESS = "payment_success"
        const val PAYMENT_FAILED = "payment_failed"
        const val DELIVERY_ASSIGNED = "delivery_assigned"
        const val PROMOTIONAL = "promotional"
    }
    
    // Discount Types
    object DiscountType {
        const val PERCENTAGE = "percentage"
        const val FIXED = "fixed"
    }
    
    // Error Codes
    object ErrorCode {
        const val NETWORK_ERROR = "NETWORK_ERROR"
        const val UNAUTHORIZED = "UNAUTHORIZED"
        const val NOT_FOUND = "NOT_FOUND"
        const val VALIDATION_ERROR = "VALIDATION_ERROR"
        const val SERVER_ERROR = "SERVER_ERROR"
        const val UNKNOWN_ERROR = "UNKNOWN_ERROR"
    }
    
    // Preferences Keys
    object PrefsKeys {
        const val IS_FIRST_LAUNCH = "is_first_launch"
        const val SELECTED_LANGUAGE = "selected_language"
        const val THEME_MODE = "theme_mode"
    }
    
    // Date Formats
    const val DATE_FORMAT_DISPLAY = "dd MMM yyyy"
    const val DATE_TIME_FORMAT_DISPLAY = "dd MMM yyyy, hh:mm a"
    const val DATE_FORMAT_API = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    
    // Image
    const val MAX_IMAGE_SIZE_MB = 5
    const val IMAGE_QUALITY = 80
    
    // Validation
    const val MIN_MOBILE_LENGTH = 10
    const val MAX_MOBILE_LENGTH = 10
    const val OTP_LENGTH = 6
    const val MIN_NAME_LENGTH = 2
    const val MAX_NAME_LENGTH = 50
    const val MIN_ADDRESS_LENGTH = 10
    const val MAX_ADDRESS_LENGTH = 200
    const val PINCODE_LENGTH = 6
}
