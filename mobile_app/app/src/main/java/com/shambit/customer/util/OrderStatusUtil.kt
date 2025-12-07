package com.shambit.customer.util

import androidx.compose.ui.graphics.Color
import com.shambit.customer.data.remote.dto.response.OrderDto
import java.text.SimpleDateFormat
import java.util.*

/**
 * Utility object for order status management
 * Handles all 20 order statuses from the production-ready backend
 */
object OrderStatusUtil {
    
    data class StatusInfo(
        val displayName: String,
        val color: Color,
        val description: String
    )
    
    /**
     * Get display information for order status
     * Supports all 20 statuses from backend
     */
    fun getStatusInfo(status: String): StatusInfo {
        return when (status.lowercase()) {
            // Payment & Confirmation (4 statuses)
            "pending" -> StatusInfo(
                "Pending",
                Color(0xFF9E9E9E),
                "Order created, awaiting payment"
            )
            "payment_processing" -> StatusInfo(
                "Processing Payment",
                Color(0xFF2196F3),
                "Payment gateway processing"
            )
            "payment_failed" -> StatusInfo(
                "Payment Failed",
                Color(0xFFF44336),
                "Payment failed, can retry"
            )
            "confirmed" -> StatusInfo(
                "Confirmed",
                Color(0xFF4CAF50),
                "Payment successful, order confirmed"
            )
            
            // Preparation & Delivery (6 statuses)
            "on_hold" -> StatusInfo(
                "On Hold",
                Color(0xFFFF9800),
                "Temporarily paused"
            )
            "preparing" -> StatusInfo(
                "Preparing",
                Color(0xFF2196F3),
                "Order being prepared"
            )
            "ready_for_pickup" -> StatusInfo(
                "Ready for Pickup",
                Color(0xFF9C27B0),
                "Packed and ready for delivery"
            )
            "out_for_delivery" -> StatusInfo(
                "Out for Delivery",
                Color(0xFF2196F3),
                "On the way to you"
            )
            "delivery_attempted" -> StatusInfo(
                "Delivery Attempted",
                Color(0xFFFF9800),
                "Delivery failed, will retry"
            )
            "delivered" -> StatusInfo(
                "Delivered",
                Color(0xFF4CAF50),
                "Successfully delivered"
            )
            
            // Return & Refund (8 statuses)
            "return_requested" -> StatusInfo(
                "Return Requested",
                Color(0xFFFF9800),
                "Return request submitted"
            )
            "return_approved" -> StatusInfo(
                "Return Approved",
                Color(0xFF2196F3),
                "Return approved by admin"
            )
            "return_rejected" -> StatusInfo(
                "Return Rejected",
                Color(0xFFF44336),
                "Return request rejected"
            )
            "return_pickup_scheduled" -> StatusInfo(
                "Pickup Scheduled",
                Color(0xFF9C27B0),
                "Return pickup scheduled"
            )
            "return_in_transit" -> StatusInfo(
                "Return in Transit",
                Color(0xFF2196F3),
                "Return being picked up"
            )
            "returned" -> StatusInfo(
                "Returned",
                Color(0xFF9E9E9E),
                "Return completed"
            )
            "refund_pending" -> StatusInfo(
                "Refund Pending",
                Color(0xFFFF9800),
                "Processing refund"
            )
            "refunded" -> StatusInfo(
                "Refunded",
                Color(0xFF4CAF50),
                "Refund completed"
            )
            
            // Terminal States (2 statuses)
            "canceled", "cancelled" -> StatusInfo(
                "Canceled",
                Color(0xFFF44336),
                "Order canceled"
            )
            "failed" -> StatusInfo(
                "Failed",
                Color(0xFFF44336),
                "Order failed"
            )
            
            else -> StatusInfo(
                status.replace("_", " ").replaceFirstChar { 
                    if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
                },
                Color(0xFF9E9E9E),
                ""
            )
        }
    }
    
    /**
     * Check if customer can request return
     * Returns can be requested within 7 days of delivery
     */
    fun canRequestReturn(order: OrderDto): Boolean {
        // Must be delivered
        if (order.status.lowercase() != "delivered") return false
        if (order.deliveredAt == null) return false
        
        // Check if within 7 days
        try {
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val deliveredDate = format.parse(order.deliveredAt) ?: return false
            val daysSinceDelivery = (System.currentTimeMillis() - deliveredDate.time) / (1000 * 60 * 60 * 24)
            return daysSinceDelivery <= 7
        } catch (e: Exception) {
            return false
        }
    }
    
    /**
     * Check if order can be canceled
     * Orders can be canceled before delivery
     */
    fun canCancelOrder(status: String): Boolean {
        return status.lowercase() in listOf(
            "pending",
            "payment_processing",
            "payment_failed",
            "confirmed",
            "on_hold",
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "delivery_attempted"
        )
    }
    
    /**
     * Check if customer can contact delivery person
     */
    fun canContactDeliveryPerson(order: OrderDto): Boolean {
        return order.status.lowercase() in listOf("out_for_delivery", "delivery_attempted") &&
               order.deliveryPersonnelId != null
    }
    
    /**
     * Check if order is in active delivery state
     */
    fun isActiveDelivery(status: String): Boolean {
        return status.lowercase() in listOf(
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "delivery_attempted"
        )
    }
    
    /**
     * Check if order is in return/refund flow
     */
    fun isInReturnFlow(status: String): Boolean {
        return status.lowercase() in listOf(
            "return_requested",
            "return_approved",
            "return_rejected",
            "return_pickup_scheduled",
            "return_in_transit",
            "returned",
            "refund_pending",
            "refunded"
        )
    }
    
    /**
     * Check if order is terminal (no further actions)
     */
    fun isTerminalStatus(status: String): Boolean {
        return status.lowercase() in listOf(
            "delivered",
            "canceled",
            "cancelled",
            "failed",
            "refunded",
            "return_rejected"
        )
    }
    
    /**
     * Get display name for timeline action type
     */
    fun getActionTypeDisplayName(actionType: String, newValue: String? = null): String {
        return when (actionType.lowercase()) {
            "order_created" -> "Order Placed"
            "status_change" -> getStatusInfo(newValue ?: "").displayName
            "payment_status_change" -> "Payment ${newValue?.replace("_", " ")?.replaceFirstChar { 
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
            } ?: "Updated"}"
            "delivery_assignment" -> "Delivery Person Assigned"
            "delivery_attempt" -> "Delivery Attempted"
            "on_hold" -> "Order Put On Hold"
            "hold_released" -> "Hold Released"
            "cancellation" -> "Order Canceled"
            "return_request" -> "Return Requested"
            "return_approval" -> "Return Approved"
            "return_rejection" -> "Return Rejected"
            "return_pickup" -> "Return Pickup Scheduled"
            "return_complete" -> "Return Completed"
            "refund_initiated" -> "Refund Initiated"
            "refund_completed" -> "Refund Completed"
            "customer_contact" -> "Customer Contacted"
            "item_substitution" -> "Item Substituted"
            "note" -> "Note Added"
            else -> actionType.replace("_", " ").replaceFirstChar { 
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
            }
        }
    }
    
    /**
     * Get payment status display info
     */
    fun getPaymentStatusInfo(paymentStatus: String): Pair<String, Color> {
        return when (paymentStatus.lowercase()) {
            "pending" -> "Pending" to Color(0xFFFF9800)
            "processing" -> "Processing" to Color(0xFF2196F3)
            "completed" -> "Completed" to Color(0xFF4CAF50)
            "failed" -> "Failed" to Color(0xFFF44336)
            "refund_initiated" -> "Refund Initiated" to Color(0xFFFF9800)
            "refund_processing" -> "Refund Processing" to Color(0xFF2196F3)
            "refund_completed" -> "Refund Completed" to Color(0xFF4CAF50)
            "refund_failed" -> "Refund Failed" to Color(0xFFF44336)
            "partially_refunded" -> "Partially Refunded" to Color(0xFFFF9800)
            else -> paymentStatus.replace("_", " ").replaceFirstChar { 
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
            } to Color(0xFF9E9E9E)
        }
    }
}
