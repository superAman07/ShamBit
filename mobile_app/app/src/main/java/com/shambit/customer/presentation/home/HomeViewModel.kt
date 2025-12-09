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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
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
    
    // Per-section states using DataState
    val heroBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val categoriesState: DataState<List<CategoryDto>> = DataState.Loading,
    val promotionalBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val featuredProductsState: DataState<List<ProductDto>> = DataState.Loading,
    
    val isOffline: Boolean = false,
    val scrollDirection: com.shambit.customer.ui.components.ScrollDirection = com.shambit.customer.ui.components.ScrollDirection.None,
    val cartItemCount: Int = 0,
    val currentRoute: String = "home",
    val cartQuantities: Map<String, Int> = emptyMap(), // Product ID to quantity mapping
    val deliveryAddress: String? = null, // Current delivery address
    
    // Transient error for Snackbar
    val error: String? = null,
    
    // Snackbar message for wishlist actions
    val snackbarMessage: String? = null
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
    private val addressRepository: com.shambit.customer.data.repository.AddressRepository,
    private val wishlistRepository: com.shambit.customer.data.repository.WishlistRepository,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _cartState = MutableStateFlow<com.shambit.customer.data.remote.dto.response.CartDto?>(null)
    
    // Optimistic cart quantities for immediate UI updates
    private val _optimisticCartQuantities = MutableStateFlow<Map<String, Int>>(emptyMap())
    
    // Merge optimistic and server state for display
    val displayCartQuantities: StateFlow<Map<String, Int>> = combine(
        _uiState,
        _optimisticCartQuantities
    ) { uiState, optimistic ->
        // Merge server state with optimistic updates
        uiState.cartQuantities + optimistic
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyMap())
    
    // Wishlist state - observe wishlist product IDs
    val wishlistProductIds: StateFlow<Set<String>> = wishlistRepository
        .getWishlistItems()
        .map { items -> items.map { it.productId }.toSet() }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    init {
        loadHomeData()
        observeCartCount()
        observeCart()
        loadCart()
        loadDefaultAddress()
        observeDefaultAddress()
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
     * Load default delivery address (initial load)
     */
    private fun loadDefaultAddress() {
        viewModelScope.launch {
            addressRepository.getAddresses()
        }
    }
    
    /**
     * Observe default address changes from repository
     * This automatically updates the UI when address changes without manual refresh
     */
    private fun observeDefaultAddress() {
        viewModelScope.launch {
            addressRepository.addresses.collect { addresses ->
                val defaultAddress = addresses.find { it.isDefault }
                val formattedAddress = defaultAddress?.let { formatAddressForHeader(it) }
                _uiState.update { it.copy(deliveryAddress = formattedAddress) }
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
     * Load all home screen data in parallel
     */
    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Launch all requests in parallel using coroutineScope
                kotlinx.coroutines.coroutineScope {
                    launch { loadHeroBanners() }
                    launch { loadFeaturedCategories() }
                    launch { loadPromotionalBanners() }
                    launch { loadFeaturedProducts() }
                }
                
                // Mark loading as complete
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: context.getString(com.shambit.customer.R.string.error_load_home_data)
                    )
                }
            }
        }
    }

    /**
     * Load hero banners
     */
    private suspend fun loadHeroBanners() {
        _uiState.update { it.copy(heroBannersState = DataState.Loading) }
        
        when (val result = bannerRepository.getHeroBanners()) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(heroBannersState = DataState.Success(result.data)) }
            }
            is NetworkResult.Error -> {
                _uiState.update { it.copy(heroBannersState = DataState.Error(result.message ?: context.getString(com.shambit.customer.R.string.error_load_banners))) }
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
        _uiState.update { it.copy(categoriesState = DataState.Loading) }
        
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
                
                _uiState.update { it.copy(categoriesState = DataState.Success(reorderedCategories)) }
            }
            is NetworkResult.Error -> {
                // Don't show error for categories, just use empty list
                _uiState.update { it.copy(categoriesState = DataState.Success(emptyList())) }
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
        _uiState.update { it.copy(promotionalBannersState = DataState.Loading) }
        
        when (val result = bannerRepository.getPromotionalBanners()) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(promotionalBannersState = DataState.Success(result.data)) }
            }
            is NetworkResult.Error -> {
                _uiState.update { it.copy(promotionalBannersState = DataState.Error(result.message ?: context.getString(com.shambit.customer.R.string.error_load_promotional_banners))) }
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
        _uiState.update { it.copy(featuredProductsState = DataState.Loading) }
        
        when (val result = productRepository.getFeaturedProducts(pageSize = 10)) {
            is NetworkResult.Success -> {
                _uiState.update { it.copy(featuredProductsState = DataState.Success(result.data.products)) }
            }
            is NetworkResult.Error -> {
                // Don't show error for featured products, just use empty list
                _uiState.update { it.copy(featuredProductsState = DataState.Success(emptyList())) }
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
                        error = e.message ?: context.getString(com.shambit.customer.R.string.error_refresh_data)
                    )
                }
                
                // Reset refresh success after delay
                kotlinx.coroutines.delay(2000)
                _uiState.update { it.copy(refreshSuccess = null) }
            }
        }
    }

    /**
     * Update scroll direction for bottom navigation behavior
     */
    fun updateScrollDirection(direction: com.shambit.customer.ui.components.ScrollDirection) {
        _uiState.update { 
            it.copy(scrollDirection = direction) 
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
     * Add product to cart with optimistic UI update
     */
    fun addToCart(productId: String, quantity: Int = 1) {
        addToCartOptimistic(productId, quantity)
    }
    
    /**
     * Add product to cart with optimistic update
     * Updates UI immediately, then syncs with server
     */
    private fun addToCartOptimistic(productId: String, quantity: Int = 1) {
        // Update UI immediately
        val currentQty = _optimisticCartQuantities.value[productId] ?: 0
        _optimisticCartQuantities.update { 
            it + (productId to currentQty + quantity)
        }
        
        // Then make API call
        viewModelScope.launch {
            when (val result = cartRepository.addToCart(productId, quantity)) {
                is NetworkResult.Success -> {
                    // Server confirmed, remove optimistic state
                    _optimisticCartQuantities.update { it - productId }
                }
                is NetworkResult.Error -> {
                    // Revert optimistic update on failure
                    _optimisticCartQuantities.update { it - productId }
                    _uiState.update { it.copy(error = result.message) }
                }
                is NetworkResult.Loading -> {
                    // Loading state
                }
            }
        }
    }
    
    /**
     * Increment product quantity in cart with optimistic update
     */
    fun incrementCart(productId: String) {
        viewModelScope.launch {
            val cartItemId = cartRepository.getCartItemForProduct(productId)
            val currentQty = cartRepository.getQuantityForProduct(productId)
            
            if (cartItemId != null && currentQty > 0) {
                // Optimistic update
                val optimisticQty = _optimisticCartQuantities.value[productId] ?: 0
                _optimisticCartQuantities.update { 
                    it + (productId to optimisticQty + 1)
                }
                
                // Update existing cart item
                when (val result = cartRepository.updateCartItem(cartItemId, currentQty + 1)) {
                    is NetworkResult.Success -> {
                        // Server confirmed, remove optimistic state
                        _optimisticCartQuantities.update { it - productId }
                    }
                    is NetworkResult.Error -> {
                        // Revert optimistic update on failure
                        _optimisticCartQuantities.update { it - productId }
                        _uiState.update { it.copy(error = result.message) }
                    }
                    is NetworkResult.Loading -> {
                        // Loading state
                    }
                }
            } else {
                // Add new item to cart
                addToCartOptimistic(productId, 1)
            }
        }
    }
    
    /**
     * Decrement product quantity in cart with optimistic update
     */
    fun decrementCart(productId: String) {
        viewModelScope.launch {
            val cartItemId = cartRepository.getCartItemForProduct(productId)
            val currentQty = cartRepository.getQuantityForProduct(productId)
            
            if (cartItemId != null && currentQty > 0) {
                // Optimistic update
                val optimisticQty = _optimisticCartQuantities.value[productId] ?: 0
                _optimisticCartQuantities.update { 
                    it + (productId to optimisticQty - 1)
                }
                
                if (currentQty == 1) {
                    // Remove item from cart
                    when (val result = cartRepository.removeFromCart(cartItemId)) {
                        is NetworkResult.Success -> {
                            // Server confirmed, remove optimistic state
                            _optimisticCartQuantities.update { it - productId }
                        }
                        is NetworkResult.Error -> {
                            // Revert optimistic update on failure
                            _optimisticCartQuantities.update { it - productId }
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
                            // Server confirmed, remove optimistic state
                            _optimisticCartQuantities.update { it - productId }
                        }
                        is NetworkResult.Error -> {
                            // Revert optimistic update on failure
                            _optimisticCartQuantities.update { it - productId }
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
     * Returns merged server and optimistic state
     */
    fun getCartQuantity(productId: String): Int {
        return displayCartQuantities.value[productId] ?: 0
    }

    /**
     * Clear error state
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    /**
     * Toggle wishlist status for a product
     * Adds to wishlist if not present, removes if already in wishlist
     */
    fun toggleWishlist(product: ProductDto) {
        viewModelScope.launch {
            try {
                val added = wishlistRepository.toggleWishlist(product)
                _uiState.update {
                    it.copy(
                        snackbarMessage = if (added) {
                            context.getString(com.shambit.customer.R.string.wishlist_added)
                        } else {
                            context.getString(com.shambit.customer.R.string.wishlist_removed)
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = context.getString(com.shambit.customer.R.string.error_update_wishlist, e.message ?: ""))
                }
            }
        }
    }
    
    /**
     * Clear snackbar message
     */
    fun clearSnackbarMessage() {
        _uiState.update { it.copy(snackbarMessage = null) }
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
