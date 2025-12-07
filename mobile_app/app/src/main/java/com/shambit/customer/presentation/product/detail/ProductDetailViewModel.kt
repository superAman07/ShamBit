package com.shambit.customer.presentation.product.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.repository.CartRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.data.repository.WishlistRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductDetailUiState(
    val isLoading: Boolean = false,
    val product: ProductDto? = null,
    val similarProducts: List<ProductDto> = emptyList(),
    val error: String? = null,
    val currentImageIndex: Int = 0,
    val isInWishlist: Boolean = false,
    val cartQuantity: Int = 0,
    val isAddingToCart: Boolean = false,
    val isTogglingWishlist: Boolean = false
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository,
    private val wishlistRepository: WishlistRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    
    private val productId: String = checkNotNull(savedStateHandle["productId"])
    
    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()
    
    init {
        loadProductDetail()
        observeWishlistStatus()
        observeCartQuantity()
    }
    
    private fun loadProductDetail() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = productRepository.getProductById(productId)) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(
                        isLoading = false,
                        product = result.data
                    ) }
                    loadSimilarProducts(result.data.categoryId)
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(
                        isLoading = false,
                        error = result.message
                    ) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    private fun loadSimilarProducts(categoryId: String) {
        viewModelScope.launch {
            when (val result = productRepository.getProductsByCategory(categoryId, pageSize = 10)) {
                is NetworkResult.Success -> {
                    val filtered = result.data.products.filter { it.id != productId }.take(6)
                    _uiState.update { it.copy(similarProducts = filtered) }
                }
                else -> {}
            }
        }
    }
    
    private fun observeWishlistStatus() {
        viewModelScope.launch {
            wishlistRepository.isInWishlistFlow(productId).collect { isInWishlist ->
                _uiState.update { it.copy(isInWishlist = isInWishlist) }
            }
        }
    }
    
    private fun observeCartQuantity() {
        viewModelScope.launch {
            cartRepository.cartState.collect { cart ->
                val quantity = cart?.items?.find { it.productId == productId }?.quantity ?: 0
                _uiState.update { it.copy(cartQuantity = quantity) }
            }
        }
    }
    
    fun updateImageIndex(index: Int) {
        _uiState.update { it.copy(currentImageIndex = index) }
    }
    
    fun addToCart() {
        val product = _uiState.value.product ?: return
        if (product.isOutOfStock()) return
        
        viewModelScope.launch {
            _uiState.update { it.copy(isAddingToCart = true) }
            cartRepository.addToCart(product.id, 1)
            _uiState.update { it.copy(isAddingToCart = false) }
        }
    }
    
    fun incrementCart() {
        val product = _uiState.value.product ?: return
        val cartItemId = cartRepository.getCartItemForProduct(product.id) ?: return
        val currentQuantity = _uiState.value.cartQuantity
        
        viewModelScope.launch {
            _uiState.update { it.copy(isAddingToCart = true) }
            cartRepository.updateCartItem(cartItemId, currentQuantity + 1)
            _uiState.update { it.copy(isAddingToCart = false) }
        }
    }
    
    fun decrementCart() {
        val product = _uiState.value.product ?: return
        val cartItemId = cartRepository.getCartItemForProduct(product.id) ?: return
        val currentQuantity = _uiState.value.cartQuantity
        
        viewModelScope.launch {
            _uiState.update { it.copy(isAddingToCart = true) }
            if (currentQuantity > 1) {
                cartRepository.updateCartItem(cartItemId, currentQuantity - 1)
            } else {
                cartRepository.removeFromCart(cartItemId)
            }
            _uiState.update { it.copy(isAddingToCart = false) }
        }
    }
    
    fun toggleWishlist() {
        val product = _uiState.value.product ?: return
        
        viewModelScope.launch {
            _uiState.update { it.copy(isTogglingWishlist = true) }
            wishlistRepository.toggleWishlist(product)
            _uiState.update { it.copy(isTogglingWishlist = false) }
        }
    }
    
    fun retry() {
        loadProductDetail()
    }
}
