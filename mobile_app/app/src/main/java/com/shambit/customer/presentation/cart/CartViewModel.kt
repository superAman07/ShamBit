package com.shambit.customer.presentation.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.CartDto
import com.shambit.customer.data.remote.dto.response.CartItemDto
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Cart UI State
 */
data class CartUiState(
    val isLoading: Boolean = false,
    val cart: CartDto? = null,
    val error: String? = null,
    val isRefreshing: Boolean = false,
    val updatingItemId: String? = null,
    val removingItemId: String? = null,
    val promoCode: String = "",
    val isApplyingPromo: Boolean = false,
    val promoError: String? = null,
    val showPromoSuccess: Boolean = false
) {
    // Helper property for easier access to cart items
    val items: List<CartItemDto>
        get() = cart?.items ?: emptyList()
}

/**
 * Cart ViewModel
 * Manages cart state and operations
 */
@HiltViewModel
class CartViewModel @Inject constructor(
    private val cartRepository: CartRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()
    
    init {
        loadCart()
    }
    
    /**
     * Load cart from API
     */
    fun loadCart() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = cartRepository.getCart()) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            cart = result.data,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Refresh cart (pull-to-refresh)
     */
    fun refreshCart() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }
            
            when (val result = cartRepository.getCart()) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            cart = result.data,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in refreshing state
                }
            }
        }
    }
    
    /**
     * Add product to cart
     */
    fun addToCart(productId: String, quantity: Int = 1) {
        viewModelScope.launch {
            _uiState.update { it.copy(updatingItemId = productId) }
            
            when (val result = cartRepository.addToCart(productId, quantity)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            updatingItemId = null,
                            cart = result.data,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            updatingItemId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in updating state
                }
            }
        }
    }
    
    /**
     * Increment product quantity in cart
     */
    fun incrementQuantity(productId: String) {
        val currentItem = _uiState.value.cart?.items?.find { it.product.id == productId }
        if (currentItem != null) {
            updateQuantity(currentItem.id, currentItem.quantity + 1)
        } else {
            addToCart(productId, 1)
        }
    }
    
    /**
     * Decrement product quantity in cart
     */
    fun decrementQuantity(productId: String) {
        val currentItem = _uiState.value.cart?.items?.find { it.product.id == productId }
        if (currentItem != null) {
            if (currentItem.quantity > 1) {
                updateQuantity(currentItem.id, currentItem.quantity - 1)
            } else {
                removeItem(currentItem.id)
            }
        }
    }
    
    /**
     * Update item quantity
     */
    fun updateQuantity(itemId: String, newQuantity: Int) {
        if (newQuantity < 1) {
            removeItem(itemId)
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(updatingItemId = itemId) }
            
            when (val result = cartRepository.updateCartItem(itemId, newQuantity)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            updatingItemId = null,
                            cart = result.data,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            updatingItemId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in updating state
                }
            }
        }
    }
    
    /**
     * Remove item from cart
     */
    fun removeItem(itemId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(removingItemId = itemId) }
            
            when (val result = cartRepository.removeFromCart(itemId)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            removingItemId = null,
                            cart = result.data,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            removingItemId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in removing state
                }
            }
        }
    }
    
    /**
     * Clear all items from cart
     */
    fun clearCart() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            when (cartRepository.clearCart()) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            cart = null,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Failed to clear cart"
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in loading state
                }
            }
        }
    }
    
    /**
     * Update promo code input
     */
    fun updatePromoCode(code: String) {
        _uiState.update {
            it.copy(
                promoCode = code,
                promoError = null,
                showPromoSuccess = false
            )
        }
    }
    
    /**
     * Apply promo code
     * TODO: Implement promo code API when available
     */
    fun applyPromoCode() {
        val code = _uiState.value.promoCode.trim()
        if (code.isEmpty()) {
            _uiState.update { it.copy(promoError = "Please enter a promo code") }
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(isApplyingPromo = true, promoError = null) }
            
            // TODO: Call promo code API when available
            // For now, show placeholder message
            kotlinx.coroutines.delay(1000)
            
            _uiState.update {
                it.copy(
                    isApplyingPromo = false,
                    promoError = "Promo code feature coming soon",
                    showPromoSuccess = false
                )
            }
        }
    }
    
    /**
     * Remove promo code
     */
    fun removePromoCode() {
        _uiState.update {
            it.copy(
                promoCode = "",
                promoError = null,
                showPromoSuccess = false
            )
        }
        // TODO: Call API to remove promo code when available
    }
    
    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    /**
     * Get cart item count
     */
    fun getCartItemCount(): Int {
        return _uiState.value.cart?.itemCount ?: 0
    }
    
    /**
     * Check if cart is empty
     */
    fun isCartEmpty(): Boolean {
        return _uiState.value.cart?.items?.isEmpty() != false
    }
}
