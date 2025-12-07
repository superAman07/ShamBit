package com.shambit.customer.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.remote.dto.response.BannerDto
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.repository.BannerRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.data.repository.PromotionRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the Home Screen
 */
data class HomeUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val refreshSuccess: Boolean? = null,
    val error: String? = null,
    val heroBanners: List<BannerDto> = emptyList(),
    val categories: List<CategoryDto> = emptyList(),
    val promotionalBanners: List<BannerDto> = emptyList(),
    val featuredProducts: List<ProductDto> = emptyList(),
    val isOffline: Boolean = false,
    val scrollOffset: Float = 0f,
    val scrollDirection: com.shambit.customer.ui.components.ScrollDirection = com.shambit.customer.ui.components.ScrollDirection.None,
    val cartItemCount: Int = 0,
    val currentRoute: String = "home",
    val cartQuantities: Map<String, Int> = emptyMap(), // Product ID to quantity mapping
    val deliveryAddress: String? = null // Current delivery address
)

/**
 * ViewModel for Home Screen
 * Manages home screen state and business logic
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val bannerRepository: BannerRepository,
    private val productRepository: ProductRepository,
    private val promotionRepository: PromotionRepository,
    private val categoryPreferencesManager: com.shambit.customer.data.local.preferences.CategoryPreferencesManager,
    private val cartRepository: com.shambit.customer.data.repository.CartRepository,
    private val addressRepository: com.shambit.customer.data.repository.AddressRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _cartState = MutableStateFlow<com.shambit.customer.data.remote.dto.response.CartDto?>(null)

    init {
        loadHomeData()
        observeCartCount()
        observeCart()
        loadCart()
        loadDefaultAddress()
    }
    
    /**
     * Load cart data
     */
    private fun loadCart() {
        viewModelScope.launch {
            cartRepository.getCart()
        }
    }
    
    /**
     * Load default delivery address
     */
    private fun loadDefaultAddress() {
        viewModelScope.launch {
            when (val result = addressRepository.getAddresses()) {
                is NetworkResult.Success -> {
                    val defaultAddress = result.data.find { it.isDefault }
                    if (defaultAddress != null) {
                        // Format address for display
                        val formattedAddress = formatAddressForHeader(defaultAddress)
                        _uiState.update { it.copy(deliveryAddress = formattedAddress) }
                    }
                }
                is NetworkResult.Error -> {
                    // Silently fail - address is optional
                }
                is NetworkResult.Loading -> {
                    // Loading state
                }
            }
        }
    }
    
    /**
     * Format address for header display
     */
    private fun formatAddressForHeader(address: com.shambit.customer.data.remote.dto.response.AddressDto): String {
        return buildString {
            // Add type (Home, Work, Other)
            append(address.type.replaceFirstChar { it.uppercase() })
            append(" - ")
            
            // Add address line 1
            append(address.addressLine1)
            
            // Add landmark if available
            if (!address.landmark.isNullOrBlank()) {
                append(", ")
                append(address.landmark)
            }
        }
    }
    
    /**
     * Observe cart item count
     */
    private fun observeCartCount() {
        viewModelScope.launch {
            cartRepository.cartItemCount.collect { count ->
                _uiState.update { it.copy(cartItemCount = count) }
            }
        }
    }
    
    /**
     * Observe cart state
     */
    private fun observeCart() {
        viewModelScope.launch {
            cartRepository.cartState.collect { cart ->
                _cartState.value = cart
                // Update cart quantities map for reactive UI
                val quantities = cart?.items?.associate { it.productId to it.quantity } ?: emptyMap()
                _uiState.update { it.copy(cartQuantities = quantities) }
            }
        }
    }

    /**
     * Load all home screen data
     */
    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Load all data in parallel
                loadHeroBanners()
                loadFeaturedCategories()
                loadPromotionalBanners()
                loadFeaturedProducts()
                
                // Mark loading as complete
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load home data"
                    )
                }
            }
        }
    }

    /**
     * Load hero banners
     */
    private suspend fun loadHeroBanners() {
        when (val result = bannerRepository.getHeroBanners()) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(heroBanners = result.data, isLoading = false) }
            }
            is NetworkResult.Error -> {
                _uiState.update { it.copy(error = result.message, isLoading = false) }
            }
            is NetworkResult.Loading -> {
                // Already in loading state
            }
        }
    }

    /**
     * Load featured categories
     */
    private suspend fun loadFeaturedCategories() {
        // Try featured categories first
        var result = productRepository.getFeaturedCategories()
        
        // If featured categories fail, fallback to all categories
        if (result is NetworkResult.Error) {
            result = productRepository.getCategories()
        }
        
        when (result) {
            is NetworkResult.Success -> {
                // Reorder categories based on tap frequency if needed
                val reorderedCategories = reorderCategoriesIfNeeded(result.data)
                
                _uiState.update { it.copy(categories = reorderedCategories) }
            }
            is NetworkResult.Error -> {
                // Don't show error for categories, just use empty list
                _uiState.update { it.copy(categories = emptyList()) }
            }
            is NetworkResult.Loading -> {
                // Already in loading state
            }
        }
    }
    
    /**
     * Reorder categories based on tap frequency
     */
    private suspend fun reorderCategoriesIfNeeded(categories: List<CategoryDto>): List<CategoryDto> {
        // Check if reordering is needed (24 hours since last reorder)
        if (!categoryPreferencesManager.shouldReorder()) {
            return categories
        }
        
        // Get tap data
        val tapData = categoryPreferencesManager.getCategoryTapData()
        
        // If no tap data, return original order
        if (tapData.isEmpty()) {
            return categories
        }
        
        // Sort categories by tap count (descending), then by original display order
        val reordered = categories.sortedWith(
            compareByDescending<CategoryDto> { category ->
                tapData[category.id]?.tapCount ?: 0
            }.thenBy { it.displayOrder }
        )
        
        // Update last reorder time
        categoryPreferencesManager.updateLastReorderTime()
        
        return reordered
    }
    
    /**
     * Track category tap
     */
    fun onCategoryTap(categoryId: String) {
        viewModelScope.launch {
            categoryPreferencesManager.trackCategoryTap(categoryId)
        }
    }

    /**
     * Load promotional banners
     */
    private suspend fun loadPromotionalBanners() {
        when (val result = bannerRepository.getPromotionalBanners()) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(promotionalBanners = result.data) }
            }
            is NetworkResult.Error -> {
                _uiState.update { it.copy(error = result.message) }
            }
            is NetworkResult.Loading -> {
                // Already in loading state
            }
        }
    }

    /**
     * Load featured products
     */
    private suspend fun loadFeaturedProducts() {
        when (val result = productRepository.getFeaturedProducts(pageSize = 10)) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(featuredProducts = result.data.products) }
            }
            is NetworkResult.Error -> {
                // Don't show error for featured products, just use empty list
                _uiState.update { it.copy(featuredProducts = emptyList()) }
            }
            is NetworkResult.Loading -> {
                // Already in loading state
            }
        }
    }



    /**
     * Refresh home data (pull-to-refresh)
     */
    fun refreshHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null, refreshSuccess = null) }

            try {
                // Force refresh all data in parallel and wait for all to complete
                kotlinx.coroutines.coroutineScope {
                    launch { loadHeroBanners() }
                    launch { loadFeaturedCategories() }
                    launch { loadPromotionalBanners() }
                    launch { loadFeaturedProducts() }
                }
                
                // Mark refresh as successful
                _uiState.update { 
                    it.copy(
                        isRefreshing = false, 
                        isLoading = false,
                        refreshSuccess = true
                    ) 
                }
                
                // Reset refresh success after delay
                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(refreshSuccess = null) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        isLoading = false,
                        refreshSuccess = false,
                        error = e.message ?: "Failed to refresh data"
                    )
                }
                
                // Reset refresh success after delay
                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(refreshSuccess = null) }
            }
        }
    }

    /**
     * Update scroll offset for adaptive header behavior
     */
    private var previousScrollOffset: Float = 0f
    
    fun updateScrollOffset(offset: Float) {
        val direction = when {
            offset > previousScrollOffset -> com.shambit.customer.ui.components.ScrollDirection.Down
            offset < previousScrollOffset -> com.shambit.customer.ui.components.ScrollDirection.Up
            else -> com.shambit.customer.ui.components.ScrollDirection.None
        }
        previousScrollOffset = offset
        
        _uiState.update { 
            it.copy(
                scrollOffset = offset,
                scrollDirection = direction
            ) 
        }
    }
    
    /**
     * Update current navigation route
     */
    fun updateCurrentRoute(route: String) {
        _uiState.update { it.copy(currentRoute = route) }
    }

    /**
     * Handle banner click action
     */
    fun onBannerClick(banner: BannerDto): BannerAction {
        return when (banner.actionType) {
            "product" -> BannerAction.NavigateToProduct(banner.actionValue ?: "")
            "category" -> BannerAction.NavigateToCategory(banner.actionValue ?: "")
            "url" -> BannerAction.OpenUrl(banner.actionValue ?: "")
            "search" -> BannerAction.NavigateToSearch(banner.actionValue ?: "")
            else -> BannerAction.None
        }
    }
    
    /**
     * Add product to cart
     */
    fun addToCart(productId: String, quantity: Int = 1) {
        viewModelScope.launch {
            when (val result = cartRepository.addToCart(productId, quantity)) {
                is NetworkResult.Success -> {
                    // Cart updated successfully
                }
                is NetworkResult.Error -> {
                    // Show error
                    _uiState.update { it.copy(error = result.message) }
                }
                is NetworkResult.Loading -> {
                    // Loading state
                }
            }
        }
    }
    
    /**
     * Increment product quantity in cart
     */
    fun incrementCart(productId: String) {
        viewModelScope.launch {
            val cartItemId = cartRepository.getCartItemForProduct(productId)
            val currentQty = cartRepository.getQuantityForProduct(productId)
            
            if (cartItemId != null && currentQty > 0) {
                // Update existing cart item
                when (val result = cartRepository.updateCartItem(cartItemId, currentQty + 1)) {
                    is NetworkResult.Success -> {
                        // Cart updated successfully
                    }
                    is NetworkResult.Error -> {
                        _uiState.update { it.copy(error = result.message) }
                    }
                    is NetworkResult.Loading -> {
                        // Loading state
                    }
                }
            } else {
                // Add new item to cart
                addToCart(productId, 1)
            }
        }
    }
    
    /**
     * Decrement product quantity in cart
     */
    fun decrementCart(productId: String) {
        viewModelScope.launch {
            val cartItemId = cartRepository.getCartItemForProduct(productId)
            val currentQty = cartRepository.getQuantityForProduct(productId)
            
            if (cartItemId != null && currentQty > 0) {
                if (currentQty == 1) {
                    // Remove item from cart
                    when (val result = cartRepository.removeFromCart(cartItemId)) {
                        is NetworkResult.Success -> {
                            // Cart updated successfully
                        }
                        is NetworkResult.Error -> {
                            _uiState.update { it.copy(error = result.message) }
                        }
                        is NetworkResult.Loading -> {
                            // Loading state
                        }
                    }
                } else {
                    // Decrease quantity
                    when (val result = cartRepository.updateCartItem(cartItemId, currentQty - 1)) {
                        is NetworkResult.Success -> {
                            // Cart updated successfully
                        }
                        is NetworkResult.Error -> {
                            _uiState.update { it.copy(error = result.message) }
                        }
                        is NetworkResult.Loading -> {
                            // Loading state
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Get cart quantity for a product
     */
    fun getCartQuantity(productId: String): Int {
        return _uiState.value.cartQuantities[productId] ?: 0
    }

    /**
     * Clear error state
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

/**
 * Banner action types
 */
sealed class BannerAction {
    data class NavigateToProduct(val productId: String) : BannerAction()
    data class NavigateToCategory(val categoryId: String) : BannerAction()
    data class OpenUrl(val url: String) : BannerAction()
    data class NavigateToSearch(val query: String) : BannerAction()
    object None : BannerAction()
}
