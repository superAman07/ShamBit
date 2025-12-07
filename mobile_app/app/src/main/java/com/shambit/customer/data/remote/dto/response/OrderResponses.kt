package com.shambit.customer.data.remote.dto.response

import com.google.gson.annotations.SerializedName

/**
 * Order DTO
 */
data class OrderDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("orderNumber")
    val orderNumber: String,
    
    @SerializedName("userId")
    val userId: String,
    
    @SerializedName("status")
    val status: String, // "pending", "confirmed", "preparing", "out_for_delivery", "delivered", "canceled", "returned", "failed"
    
    @SerializedName("deliveryAddressId")
    val deliveryAddressId: String,
    
    @SerializedName("deliveryAddress")
    val deliveryAddress: AddressDto?,
    
    @SerializedName("subtotal")
    val subtotal: Double,
    
    @SerializedName("taxAmount")
    val taxAmount: Double,
    
    @SerializedName("deliveryFee")
    val deliveryFee: Double,
    
    @SerializedName("discountAmount")
    val discountAmount: Double,
    
    @SerializedName("totalAmount")
    val totalAmount: Double,
    
    @SerializedName("paymentMethod")
    val paymentMethod: String,
    
    @SerializedName("paymentStatus")
    val paymentStatus: String, // "pending", "completed", "failed", "refunded"
    
    @SerializedName("paymentId")
    val paymentId: String? = null,
    
    @SerializedName("promoCode")
    val promoCode: String? = null,
    
    @SerializedName("deliveryPersonnelId")
    val deliveryPersonnelId: String? = null,
    
    @SerializedName("estimatedDeliveryTime")
    val estimatedDeliveryTime: String? = null,
    
    @SerializedName("actualDeliveryTime")
    val actualDeliveryTime: String? = null,
    
    @SerializedName("items")
    val items: List<OrderItemDto>? = null,
    
    @SerializedName("createdAt")
    val createdAt: String,
    
    @SerializedName("updatedAt")
    val updatedAt: String,
    
    @SerializedName("confirmedAt")
    val confirmedAt: String? = null,
    
    @SerializedName("deliveredAt")
    val deliveredAt: String? = null,
    
    @SerializedName("canceledAt")
    val canceledAt: String? = null,
    
    @SerializedName("timeline")
    val timeline: List<OrderHistoryDto>? = null
)

/**
 * Order History/Timeline DTO
 */
data class OrderHistoryDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("actionType")
    val actionType: String, // "order_created", "status_change", "delivery_assignment", "cancellation", "return", "note"
    
    @SerializedName("oldValue")
    val oldValue: String? = null,
    
    @SerializedName("newValue")
    val newValue: String? = null,
    
    @SerializedName("reason")
    val reason: String? = null,
    
    @SerializedName("note")
    val note: String? = null,
    
    @SerializedName("adminId")
    val adminId: String? = null,
    
    @SerializedName("adminEmail")
    val adminEmail: String? = null,
    
    @SerializedName("createdAt")
    val createdAt: String
)

data class OrderItemDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("orderId")
    val orderId: String,
    
    @SerializedName("productId")
    val productId: String,
    
    @SerializedName("productName")
    val productName: String,
    
    @SerializedName("productImage")
    val productImage: String? = null,
    
    @SerializedName("unitPrice")
    val unitPrice: Double,
    
    @SerializedName("quantity")
    val quantity: Int,
    
    @SerializedName("totalPrice")
    val totalPrice: Double
)

/**
 * Create order response
 */
data class CreateOrderResponse(
    @SerializedName("order")
    val order: OrderDto,
    
    @SerializedName("paymentDetails")
    val paymentDetails: PaymentDetailsDto? = null
)

data class PaymentDetailsDto(
    @SerializedName("razorpayOrderId")
    val razorpayOrderId: String,
    
    @SerializedName("amount")
    val amount: Double,
    
    @SerializedName("currency")
    val currency: String,
    
    @SerializedName("receipt")
    val receipt: String
)

/**
 * Order list response wrapper
 */
data class OrderListResponse(
    @SerializedName("orders")
    val orders: List<OrderDto> = emptyList(),
    
    @SerializedName("pagination")
    val pagination: PaginationDto
)

/**
 * Custom API response for orders endpoint
 * The API returns data as an array directly, not wrapped in an object
 */
data class OrdersApiResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("data")
    val data: List<OrderDto>,
    
    @SerializedName("pagination")
    val pagination: PaginationDto,
    
    @SerializedName("error")
    val error: ErrorDto? = null
)

data class ErrorDto(
    @SerializedName("message")
    val message: String,
    
    @SerializedName("code")
    val code: String? = null
)

data class PaginationDto(
    @SerializedName("page")
    val page: Int,
    
    @SerializedName("pageSize")
    val pageSize: Int,
    
    @SerializedName("totalPages")
    val totalPages: Int,
    
    @SerializedName("totalItems")
    val totalItems: Int
)

/**
 * Delivery tracking DTO
 */
data class DeliveryDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("orderId")
    val orderId: String,
    
    @SerializedName("deliveryPersonnelId")
    val deliveryPersonnelId: String,
    
    @SerializedName("status")
    val status: String, // "assigned", "picked_up", "in_transit", "delivered", "failed"
    
    @SerializedName("estimatedDeliveryTime")
    val estimatedDeliveryTime: String,
    
    @SerializedName("distanceKm")
    val distanceKm: Double,
    
    @SerializedName("deliveryPersonnel")
    val deliveryPersonnel: DeliveryPersonnelDto? = null,
    
    @SerializedName("assignedAt")
    val assignedAt: String,
    
    @SerializedName("pickedUpAt")
    val pickedUpAt: String? = null,
    
    @SerializedName("deliveredAt")
    val deliveredAt: String? = null
)

data class DeliveryPersonnelDto(
    @SerializedName("name")
    val name: String,
    
    @SerializedName("mobileNumber")
    val mobileNumber: String,
    
    @SerializedName("vehicleType")
    val vehicleType: String? = null,
    
    @SerializedName("currentLatitude")
    val currentLatitude: Double? = null,
    
    @SerializedName("currentLongitude")
    val currentLongitude: Double? = null
)

/**
 * Promotion validation response
 */
data class PromotionValidationResponse(
    @SerializedName("valid")
    val valid: Boolean,
    
    @SerializedName("promotion")
    val promotion: OrderPromotionDto? = null,
    
    @SerializedName("discountAmount")
    val discountAmount: Double? = null,
    
    @SerializedName("finalAmount")
    val finalAmount: Double? = null,
    
    @SerializedName("error")
    val error: String? = null,
    
    @SerializedName("errorCode")
    val errorCode: String? = null
)

/**
 * Order Promotion DTO (used in order context)
 */
data class OrderPromotionDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("code")
    val code: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("discountType")
    val discountType: String, // "percentage" or "fixed"
    
    @SerializedName("discountValue")
    val discountValue: Double,
    
    @SerializedName("minOrderValue")
    val minOrderValue: Double? = null,
    
    @SerializedName("maxDiscountAmount")
    val maxDiscountAmount: Double? = null
)
