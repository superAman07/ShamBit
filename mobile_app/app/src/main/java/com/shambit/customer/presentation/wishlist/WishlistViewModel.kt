package com.shambit.customer.presentation.wishlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.local.database.WishlistEntity
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.data.repository.WishlistRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Wishlist UI State
 */
data class WishlistUiState(
    val isLoading: Boolean = false,
    val wishlistItems: List<WishlistEntity> = emptyList(),
    val error: String? = null,
    val removingItemId: String? = null,
    val addingToCartId: String? = null
)

/**
 * Wishlist ViewModel
 * Manages wishlist state and operations
 */
@HiltViewModel
class WishlistViewModel @Inject constructor(
    private val wishlistRepository: WishlistRepository,
    private val cartRepository: CartRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(WishlistUiState())
    val uiState: StateFlow<WishlistUiState> = _uiState.asStateFlow()
    
    init {
        loadWishlist()
    }
    
    /**
     * Load wishlist items
     */
    private fun loadWishlist() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                wishlistRepository.getWishlistItems().collect { items ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            wishlistItems = items,
                            error = null
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load wishlist"
                    )
                }
            }
        }
    }
    
    /**
     * Remove item from wishlist
     */
    fun removeFromWishlist(productId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(removingItemId = productId) }
            
            try {
                wishlistRepository.removeFromWishlist(productId)
                _uiState.update {
                    it.copy(
                        removingItemId = null,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        removingItemId = null,
                        error = e.message ?: "Failed to remove item"
                    )
                }
            }
        }
    }
    
    /**
     * Add item to cart
     */
    fun addToCart(productId: String, quantity: Int = 1) {
        viewModelScope.launch {
            _uiState.update { it.copy(addingToCartId = productId) }
            
            when (val result = cartRepository.addToCart(productId, quantity)) {
                is NetworkResult.Success -> {
                    _uiState.update {
                        it.copy(
                            addingToCartId = null,
                            error = null
                        )
                    }
                }
                is NetworkResult.Error -> {
                    _uiState.update {
                        it.copy(
                            addingToCartId = null,
                            error = result.message
                        )
                    }
                }
                is NetworkResult.Loading -> {
                    // Already in adding state
                }
            }
        }
    }
    
    /**
     * Clear entire wishlist
     */
    fun clearWishlist() {
        viewModelScope.launch {
            try {
                wishlistRepository.clearWishlist()
                _uiState.update { it.copy(error = null) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = e.message ?: "Failed to clear wishlist")
                }
            }
        }
    }
    
    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    /**
     * Get wishlist item count
     */
    fun getWishlistItemCount(): Int {
        return _uiState.value.wishlistItems.size
    }
    
    /**
     * Check if wishlist is empty
     */
    fun isWishlistEmpty(): Boolean {
        return _uiState.value.wishlistItems.isEmpty()
    }
}
