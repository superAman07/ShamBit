package com.shambit.customer.data.repository

import com.shambit.customer.data.remote.api.AddToCartRequest
import com.shambit.customer.data.remote.api.CartApi
import com.shambit.customer.data.remote.api.UpdateCartItemRequest
import com.shambit.customer.data.remote.dto.response.CartDto
import com.shambit.customer.util.NetworkResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cart Repository
 * Handles cart operations with caching
 */
@Singleton
class CartRepository @Inject constructor(
    private val cartApi: CartApi
) {
    private val _cartState = MutableStateFlow<CartDto?>(null)
    val cartState: StateFlow<CartDto?> = _cartState.asStateFlow()
    
    private val _cartItemCount = MutableStateFlow(0)
    val cartItemCount: StateFlow<Int> = _cartItemCount.asStateFlow()
    
    /**
     * Get user's cart
     */
    suspend fun getCart(): NetworkResult<CartDto> {
        return try {
            val response = cartApi.getCart()
            if (response.isSuccessful && response.body()?.success == true) {
                val cart = response.body()?.data
                if (cart != null) {
                    _cartState.value = cart
                    _cartItemCount.value = cart.itemCount
                    NetworkResult.Success(cart)
                } else {
                    NetworkResult.Error("Cart data is null")
                }
            } else {
                NetworkResult.Error(response.body()?.error?.message ?: "Failed to load cart")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error occurred")
        }
    }
    
    /**
     * Add item to cart
     * Backend returns CartItemDto, so we fetch full cart after adding
     */
    suspend fun addToCart(productId: String, quantity: Int = 1): NetworkResult<CartDto> {
        return try {
            val response = cartApi.addToCart(AddToCartRequest(productId, quantity))
            if (response.isSuccessful && response.body()?.success == true) {
                // Backend returns single CartItemDto, fetch full cart
                return getCart()
            } else {
                NetworkResult.Error(response.body()?.error?.message ?: "Failed to add to cart")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error occurred")
        }
    }
    
    /**
     * Update cart item quantity
     * Backend returns CartItemDto, so we fetch full cart after updating
     */
    suspend fun updateCartItem(itemId: String, quantity: Int): NetworkResult<CartDto> {
        return try {
            val response = cartApi.updateCartItem(itemId, UpdateCartItemRequest(quantity))
            if (response.isSuccessful && response.body()?.success == true) {
                // Backend returns single CartItemDto, fetch full cart
                return getCart()
            } else {
                NetworkResult.Error(response.body()?.error?.message ?: "Failed to update cart")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error occurred")
        }
    }
    
    /**
     * Remove item from cart
     */
    suspend fun removeFromCart(itemId: String): NetworkResult<CartDto> {
        return try {
            val response = cartApi.removeFromCart(itemId)
            if (response.isSuccessful && response.body()?.success == true) {
                val cart = response.body()?.data
                if (cart != null) {
                    _cartState.value = cart
                    _cartItemCount.value = cart.itemCount
                    NetworkResult.Success(cart)
                } else {
                    NetworkResult.Error("Cart data is null")
                }
            } else {
                NetworkResult.Error(response.body()?.error?.message ?: "Failed to remove from cart")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error occurred")
        }
    }
    
    /**
     * Clear cart
     */
    suspend fun clearCart(): NetworkResult<Unit> {
        return try {
            val response = cartApi.clearCart()
            if (response.isSuccessful && response.body()?.success == true) {
                _cartState.value = null
                _cartItemCount.value = 0
                NetworkResult.Success(Unit)
            } else {
                NetworkResult.Error(response.body()?.error?.message ?: "Failed to clear cart")
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error occurred")
        }
    }
    
    /**
     * Get cart item for product
     */
    fun getCartItemForProduct(productId: String): String? {
        return _cartState.value?.items?.find { it.productId == productId }?.id
    }
    
    /**
     * Get quantity for product in cart
     */
    fun getQuantityForProduct(productId: String): Int {
        return _cartState.value?.items?.find { it.productId == productId }?.quantity ?: 0
    }
}
