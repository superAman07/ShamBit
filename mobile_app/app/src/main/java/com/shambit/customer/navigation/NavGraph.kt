package com.shambit.customer.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.shambit.customer.presentation.auth.login.LoginScreen
import com.shambit.customer.presentation.auth.otp.OtpScreen
import com.shambit.customer.presentation.category.CategoryProductsScreen
import com.shambit.customer.presentation.home.HomeScreen
import com.shambit.customer.presentation.product.detail.ProductDetailScreen
import com.shambit.customer.presentation.search.SearchScreen

/**
 * Main navigation graph for the app
 */
@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        // Auth Flow
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToOtp = { phone ->
                    navController.navigate(Screen.Otp.createRoute(phone))
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = Screen.Otp.route,
            arguments = listOf(
                navArgument("phone") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val phone = backStackEntry.arguments?.getString("phone") ?: ""
            OtpScreen(
                phone = phone,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Home Flow
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToSearch = {
                    navController.navigate(Screen.Search.route)
                },
                onNavigateToWishlist = {
                    navController.navigate(Screen.Wishlist.route)
                },
                onNavigateToCart = {
                    navController.navigate(Screen.Cart.route)
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                },
                onNavigateToCategory = { categoryId ->
                    navController.navigate(Screen.CategoryProducts.createRoute(categoryId))
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                },
                onNavigateToAddressSelection = {
                    navController.navigate(Screen.AddressSelection.route)
                },
                onOpenUrl = { url ->
                    // TODO: Open URL in browser
                }
            )
        }
        
        // Search Screen
        composable(Screen.Search.route) {
            SearchScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToWishlist = {
                    navController.navigate(Screen.Wishlist.route)
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                }
            )
        }
        
        // Product Detail Screen
        composable(
            route = Screen.ProductDetail.route,
            arguments = listOf(
                navArgument("productId") { type = NavType.StringType }
            )
        ) {
            ProductDetailScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToCart = {
                    navController.navigate(Screen.Cart.route)
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                },
                onShare = { product ->
                    // TODO: Implement share functionality
                }
            )
        }
        
        // Category Products Screen
        composable(
            route = Screen.CategoryProducts.route,
            arguments = listOf(
                navArgument("categoryId") { type = NavType.StringType }
            )
        ) {
            CategoryProductsScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                }
            )
        }
        
        // Wishlist Screen
        composable(Screen.Wishlist.route) {
            com.shambit.customer.presentation.wishlist.WishlistScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToSearch = {
                    navController.navigate(Screen.Search.route)
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Profile.route)
                }
            )
        }
        
        // Orders Screen
        composable(Screen.Orders.route) {
            com.shambit.customer.presentation.orders.list.OrdersScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToOrderDetail = { orderId ->
                    navController.navigate(Screen.OrderDetail.createRoute(orderId))
                }
            )
        }
        
        // Order Detail Screen
        composable(
            route = Screen.OrderDetail.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            
            com.shambit.customer.presentation.orders.detail.OrderDetailScreen(
                orderId = orderId,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                }
            )
        }
        
        // Profile Screen
        composable(Screen.Profile.route) {
            com.shambit.customer.presentation.profile.ProfileScreen(
                onNavigateToOrders = {
                    navController.navigate(Screen.Orders.route)
                },
                onNavigateToAddresses = {
                    navController.navigate(Screen.Addresses.route)
                },
                onNavigateToWishlist = {
                    navController.navigate(Screen.Wishlist.route)
                },
                onNavigateToEditProfile = {
                    navController.navigate(Screen.EditProfile.route)
                },
                onNavigateToNotifications = {
                    navController.navigate(Screen.Notifications.route)
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToSearch = {
                    navController.navigate(Screen.Search.route)
                }
            )
        }
        
        // Edit Profile Screen
        composable(Screen.EditProfile.route) {
            com.shambit.customer.presentation.profile.EditProfileScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        // Addresses Screen (Placeholder)
        composable(Screen.Addresses.route) {
            // Reuse AddressSelectionScreen for now
            com.shambit.customer.presentation.checkout.address.AddressSelectionScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToAddAddress = {
                    navController.navigate(Screen.AddEditAddress.createRoute())
                },
                onNavigateToEditAddress = { addressId ->
                    navController.navigate(Screen.AddEditAddress.createRoute(addressId))
                },
                onAddressSelected = { /* No action needed in profile context */ }
            )
        }
        
        // Notifications Screen
        composable(Screen.Notifications.route) {
            com.shambit.customer.presentation.notifications.NotificationsScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToOrder = { orderId ->
                    navController.navigate(Screen.OrderDetail.createRoute(orderId))
                }
            )
        }
        
        // Cart Screen
        composable(Screen.Cart.route) {
            com.shambit.customer.presentation.cart.CartScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToCheckout = {
                    // Navigate directly to address selection
                    navController.navigate(Screen.AddressSelection.route)
                },
                onNavigateToProduct = { productId ->
                    navController.navigate(Screen.ProductDetail.createRoute(productId))
                }
            )
        }
        
        // Checkout Screen (Placeholder)
        composable(Screen.Checkout.route) {
            // Navigate directly to address selection for now
            navController.navigate(Screen.AddressSelection.route) {
                popUpTo(Screen.Checkout.route) { inclusive = true }
            }
        }
        
        // Address Selection Screen
        composable(Screen.AddressSelection.route) {
            com.shambit.customer.presentation.checkout.address.AddressSelectionScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToAddAddress = {
                    navController.navigate(Screen.AddEditAddress.createRoute())
                },
                onNavigateToEditAddress = { addressId ->
                    navController.navigate(Screen.AddEditAddress.createRoute(addressId))
                },
                onAddressSelected = { addressId ->
                    navController.navigate(Screen.OrderSummary.route)
                }
            )
        }
        
        // Add/Edit Address Screen
        composable(
            route = Screen.AddEditAddress.route,
            arguments = listOf(
                navArgument("addressId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) {
            com.shambit.customer.presentation.checkout.address.AddEditAddressScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        // Order Summary Screen
        composable(Screen.OrderSummary.route) {
            com.shambit.customer.presentation.checkout.summary.OrderSummaryScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToPayment = { orderId, razorpayOrderId, amount ->
                    navController.navigate(
                        Screen.Payment.createRoute(orderId, razorpayOrderId ?: "", amount)
                    )
                }
            )
        }
        
        // Payment Screen
        composable(
            route = Screen.Payment.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType },
                navArgument("razorpayOrderId") { type = NavType.StringType },
                navArgument("amount") { type = NavType.FloatType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            val razorpayOrderId = backStackEntry.arguments?.getString("razorpayOrderId")
            val amount = backStackEntry.arguments?.getFloat("amount")?.toDouble() ?: 0.0
            
            com.shambit.customer.presentation.checkout.payment.PaymentScreen(
                orderId = orderId,
                razorpayOrderId = razorpayOrderId?.takeIf { it.isNotBlank() },
                amount = amount,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onPaymentSuccess = { orderId ->
                    navController.navigate(Screen.OrderConfirmation.createRoute(orderId)) {
                        popUpTo(Screen.Cart.route) { inclusive = true }
                    }
                }
            )
        }
        
        // Order Confirmation Screen
        composable(
            route = Screen.OrderConfirmation.route,
            arguments = listOf(
                navArgument("orderId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
            
            com.shambit.customer.presentation.checkout.confirmation.OrderConfirmationScreen(
                orderId = orderId,
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToOrderTracking = { orderId ->
                    // TODO: Navigate to order tracking screen
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        // TODO: Add other screens as we build them
        // Orders, Profile, etc.
    }
}
