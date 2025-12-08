package com.shambit.customer.navigation

/**
 * Sealed class representing all navigation destinations in the app
 */
sealed class Screen(val route: String) {
    // Auth Flow
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Otp : Screen("otp/{phone}") {
        fun createRoute(phone: String) = "otp/$phone"
    }
    
    // Main Flow
    object Home : Screen("home")
    object Search : Screen("search")
    object Cart : Screen("cart")
    object Wishlist : Screen("wishlist")
    object Profile : Screen("profile")
    
    // Product Flow
    object ProductDetail : Screen("product/{productId}") {
        fun createRoute(productId: String) = "product/$productId"
    }
    object CategoryDetail : Screen("category/detail/{categoryId}") {
        fun createRoute(categoryId: String) = "category/detail/$categoryId"
    }
    object CategoryProducts : Screen("category/{categoryId}") {
        fun createRoute(categoryId: String) = "category/$categoryId"
    }
    
    // Checkout Flow
    object Checkout : Screen("checkout")
    object AddressSelection : Screen("checkout/address")
    object AddEditAddress : Screen("checkout/address/edit?addressId={addressId}") {
        fun createRoute(addressId: String? = null) = 
            if (addressId != null) "checkout/address/edit?addressId=$addressId"
            else "checkout/address/edit"
    }
    object OrderSummary : Screen("checkout/summary")
    object Payment : Screen("checkout/payment/{orderId}/{razorpayOrderId}/{amount}") {
        fun createRoute(orderId: String, razorpayOrderId: String, amount: Double) = 
            "checkout/payment/$orderId/$razorpayOrderId/$amount"
    }
    object OrderConfirmation : Screen("checkout/confirmation/{orderId}") {
        fun createRoute(orderId: String) = "checkout/confirmation/$orderId"
    }
    
    // Orders Flow
    object Orders : Screen("orders")
    object OrderDetail : Screen("orders/{orderId}") {
        fun createRoute(orderId: String) = "orders/$orderId"
    }
    
    // Profile Flow
    object EditProfile : Screen("profile/edit")
    object Addresses : Screen("profile/addresses")
    object Notifications : Screen("profile/notifications")
}
