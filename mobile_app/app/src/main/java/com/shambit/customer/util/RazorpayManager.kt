package com.shambit.customer.util

import android.app.Activity
import android.util.Log
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Razorpay Payment Manager
 * Handles Razorpay payment integration
 */
@Singleton
class RazorpayManager @Inject constructor() {
    
    companion object {
        private const val TAG = "RazorpayManager"
        private const val RAZORPAY_KEY = "rzp_test_your_key_here" // Replace with actual key
    }
    
    /**
     * Initialize Razorpay checkout
     */
    fun initializePayment(
        activity: Activity,
        orderId: String,
        razorpayOrderId: String,
        amount: Double,
        customerName: String,
        customerEmail: String,
        customerPhone: String,
        onSuccess: (paymentId: String, orderId: String, signature: String) -> Unit,
        onFailure: (code: Int, message: String) -> Unit
    ) {
        try {
            val checkout = Checkout()
            checkout.setKeyID(RAZORPAY_KEY)
            
            // Create payment options
            val options = JSONObject().apply {
                put("name", "ShamBit")
                put("description", "Order #$orderId")
                put("order_id", razorpayOrderId)
                put("currency", "INR")
                put("amount", (amount * 100).toInt()) // Amount in paise
                
                // Customer details
                val prefill = JSONObject().apply {
                    put("name", customerName)
                    put("email", customerEmail)
                    put("contact", customerPhone)
                }
                put("prefill", prefill)
                
                // Theme
                val theme = JSONObject().apply {
                    put("color", "#FF6B35")
                }
                put("theme", theme)
            }
            
            // Create payment result listener
            val listener = object : PaymentResultListener {
                override fun onPaymentSuccess(paymentId: String?) {
                    Log.d(TAG, "Payment Success: $paymentId")
                    if (paymentId != null) {
                        // In production, verify signature on backend
                        onSuccess(paymentId, razorpayOrderId, "")
                    } else {
                        onFailure(0, "Payment ID is null")
                    }
                }
                
                override fun onPaymentError(code: Int, message: String?) {
                    Log.e(TAG, "Payment Error: $code - $message")
                    onFailure(code, message ?: "Payment failed")
                }
            }
            
            // Open Razorpay checkout
            checkout.open(activity, options)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing payment", e)
            onFailure(0, e.message ?: "Failed to initialize payment")
        }
    }
    
    /**
     * Verify payment signature (should be done on backend)
     */
    fun verifySignature(
        orderId: String,
        paymentId: String,
        signature: String
    ): Boolean {
        // This should be done on backend for security
        // For now, we'll just return true
        return true
    }
}
