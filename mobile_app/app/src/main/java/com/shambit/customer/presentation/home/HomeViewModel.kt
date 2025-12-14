package com.shambit.customer.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.analytics.AnalyticsBatcher
import com.shambit.customer.data.remote.dto.response.BannerDto
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.remote.dto.response.SortOption
import com.shambit.customer.data.repository.BannerRepository
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.data.repository.PromotionRepository
import com.shambit.customer.domain.manager.AddressStateManager
import com.shambit.customer.domain.model.Address
import com.shambit.customer.domain.usecase.GetAddressesUseCase
import com.shambit.customer.domain.usecase.SelectCheckoutAddressUseCase
import com.shambit.customer.util.NetworkResult
import com.shambit.customer.util.NetworkConnectivityHelper
import com.shambit.customer.util.NetworkConnectivityManager
import com.shambit.customer.util.NetworkErrorType
import com.shambit.customer.util.RecommendedAction
import com.shambit.customer.util.EnhancedRetryHandler
import com.shambit.customer.R
import kotlin.math.pow
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
 * Sort and filter state for the Home Screen
 */
data class SortFilterState(
    val sortBy: SortOption = SortOption.RELEVANCE
)

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
    
    // NEW: Post-promotional section state
    val subcategoriesState: DataState<List<com.shambit.customer.data.remote.dto.response.SubcategoryDto>> = DataState.Success(emptyList()),
    val selectedCategoryId: String? = null, // Track which parent category is selected
    val selectedSubcategoryId: String? = null,
    val verticalProductFeedState: DataState<com.shambit.customer.data.remote.dto.response.ProductFeedResponse> = DataState.Success(
        com.shambit.customer.data.remote.dto.response.ProductFeedResponse(
            products = emptyList(),
            cursor = null,
            hasMore = false,
            totalCount = 0
        )
    ),
    val sortFilterState: SortFilterState = SortFilterState(),
    val showStickyBar: Boolean = false,
    val showScrollToTop: Boolean = false,
    
    // NEW: Infinite scroll state
    val isLoadingMore: Boolean = false,
    val hasMoreProducts: Boolean = true,
    val currentCursor: String? = null,
    
    // NEW: Filter state
    val availableFilters: List<com.shambit.customer.data.remote.dto.response.FilterOption> = emptyList(),
    val appliedFilters: Map<String, com.shambit.customer.data.remote.dto.response.AppliedFilterValue> = emptyMap(),
    val showFilterBottomSheet: Boolean = false,
    val showSortBottomSheet: Boolean = false,
    
    // PERFORMANCE FIX: Cache filters per subcategory to prevent repeated API calls
    val filterCache: Map<String, List<com.shambit.customer.data.remote.dto.response.FilterOption>> = emptyMap(),
    val lastFilterLoadedSubcategoryId: String? = null,
    
    val isOffline: Boolean = false,
    val scrollDirection: com.shambit.customer.ui.components.ScrollDirection = com.shambit.customer.ui.components.ScrollDirection.None,
    val cartItemCount: Int = 0,
    val currentRoute: String = "home",
    val cartQuantities: Map<String, Int> = emptyMap(), // Product ID to quantity mapping
    val deliveryAddress: String? = null, // Current delivery address (legacy)
    val defaultAddress: Address? = null, // Current default address
    val addresses: List<Address>? = null, // All addresses for bottom sheet
    
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
    private val getAddressesUseCase: GetAddressesUseCase,
    private val selectCheckoutAddressUseCase: SelectCheckoutAddressUseCase,
    private val addressStateManager: AddressStateManager,
    private val networkConnectivityManager: NetworkConnectivityManager,
    private val enhancedRetryHandler: EnhancedRetryHandler,
    private val performanceMonitor: com.shambit.customer.util.PerformanceMonitor,
    private val analyticsBatcher: com.shambit.customer.data.analytics.AnalyticsBatcher,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _cartState = MutableStateFlow<com.shambit.customer.data.remote.dto.response.CartDto?>(null)
    
    // Address-related state flows as per requirements - now using shared state
    val defaultAddress: StateFlow<Address?> = addressStateManager.defaultAddress
    val addresses: StateFlow<List<Address>> = addressStateManager.addresses
    
    private val _showAddressBottomSheet = MutableStateFlow(false)
    val showAddressBottomSheet: StateFlow<Boolean> = _showAddressBottomSheet.asStateFlow()
    
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
        observeSharedAddressState()
        
        // Initialize offline state monitoring (Requirements: 11.4)
        handleOfflineState()
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
     * Requirements: 4.3, 4.4, 10.4
     */
    fun loadDefaultAddress() {
        viewModelScope.launch {
            // Refresh addresses through shared state manager
            when (val result = addressStateManager.refreshAddresses()) {
                is NetworkResult.Success -> {
                    // State is automatically updated via observeSharedAddressState()
                }
                is NetworkResult.Error -> {
                    // Handle error silently for now, could add error state later
                    _uiState.update { 
                        it.copy(
                            deliveryAddress = null,
                            defaultAddress = null,
                            addresses = emptyList()
                        ) 
                    }
                }
                is NetworkResult.Loading -> {
                    // Loading state handled by individual sections
                }
            }
        }
    }
    
    /**
     * Observe shared address state for cross-screen synchronization
     * This automatically updates the UI when address changes from any screen
     * Requirements: 4.4, 10.4
     */
    private fun observeSharedAddressState() {
        viewModelScope.launch {
            // Observe default address changes
            defaultAddress.collect { address ->
                val formattedAddress = address?.toShortDisplayString()
                _uiState.update { 
                    it.copy(
                        deliveryAddress = formattedAddress,
                        defaultAddress = address
                    ) 
                }
            }
        }
        
        viewModelScope.launch {
            // Observe all addresses for bottom sheet
            addresses.collect { addressList ->
                _uiState.update { 
                    it.copy(addresses = addressList) 
                }
            }
        }
    }
    
    /**
     * Open address selection bottom sheet
     * Requirements: 5.1
     */
    fun openAddressSelection() {
        _showAddressBottomSheet.value = true
    }
    
    /**
     * Close address selection bottom sheet
     */
    fun closeAddressSelection() {
        _showAddressBottomSheet.value = false
    }
    
    /**
     * Select an address and propagate state changes
     * Requirements: 4.4, 5.3, 10.4
     */
    fun selectAddress(address: Address) {
        viewModelScope.launch {
            // Close bottom sheet
            _showAddressBottomSheet.value = false
            
            // Update shared state for immediate cross-screen synchronization
            addressStateManager.selectCheckoutAddress(address.id)
            
            // Propagate selection through use case for checkout synchronization
            when (val result = selectCheckoutAddressUseCase(address.id)) {
                is NetworkResult.Success -> {
                    // Selection successful, update shared state
                    addressStateManager.setDefaultAddress(address.id)
                }
                is NetworkResult.Error -> {
                    // Handle error but keep optimistic update
                    // Could show error message to user
                }
                is NetworkResult.Loading -> {
                    // Loading state
                }
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
                    // Don't load product feed initially - wait for user to select subcategory
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
                android.util.Log.d("HomeViewModel", "Raw categories loaded: ${result.data.size} items")
                result.data.forEach { category ->
                    android.util.Log.d("HomeViewModel", "  - ${category.name} (parentId: ${category.parentId})")
                }
                
                // Filter to only parent categories (those with parentId == null)
                val parentCategories = result.data.filter { it.parentId == null }
                android.util.Log.d("HomeViewModel", "Filtered parent categories: ${parentCategories.size} items")
                parentCategories.forEach { category ->
                    android.util.Log.d("HomeViewModel", "  - ${category.name}")
                }
                
                // Reorder categories based on tap frequency if needed
                val reorderedCategories = reorderCategoriesIfNeeded(parentCategories)
                
                _uiState.update { it.copy(categoriesState = DataState.Success(reorderedCategories)) }
                
                // Automatically select and load subcategories for the first parent category
                if (reorderedCategories.isNotEmpty()) {
                    val firstCategory = reorderedCategories.first()
                    android.util.Log.d("HomeViewModel", "Auto-selecting first parent category: ${firstCategory.name} (${firstCategory.id})")
                    selectCategory(firstCategory.id)
                }
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
     * Select a category and load its subcategories
     * This method allows dynamic switching between categories
     * Requirements: 1.1, 1.2
     */
    fun selectCategory(categoryId: String) {
        android.util.Log.d("HomeViewModel", "========================================")
        android.util.Log.d("HomeViewModel", "Selecting category: $categoryId")
        
        // Update selected category in UI state
        _uiState.update { 
            it.copy(
                selectedCategoryId = categoryId,
                // Reset subcategory selection when changing category
                selectedSubcategoryId = null,
                // Clear product feed when changing category - user needs to select subcategory
                verticalProductFeedState = DataState.Success(
                    com.shambit.customer.data.remote.dto.response.ProductFeedResponse(
                        products = emptyList(),
                        cursor = null,
                        hasMore = false,
                        totalCount = 0
                    )
                ),
                currentCursor = null,
                hasMoreProducts = false,
                // Clear applied filters when changing category
                appliedFilters = emptyMap(),
                // Clear filter cache for new category
                availableFilters = emptyList()
            ) 
        }
        
        // Load subcategories for the selected category
        loadSubcategories(categoryId)
        
        android.util.Log.d("HomeViewModel", "========================================")
    }

    /**
     * Load subcategories for a given category
     * Requirements: 1.1, 1.2
     */
    fun loadSubcategories(categoryId: String) {
        android.util.Log.d("HomeViewModel", "========================================")
        android.util.Log.d("HomeViewModel", "Loading subcategories for categoryId: $categoryId")
        
        viewModelScope.launch {
            _uiState.update { it.copy(subcategoriesState = DataState.Loading) }
            
            try {
                // Use enhanced retry logic for subcategories (Requirements: 11.4, 11.5)
                when (val result = retryWithEnhancedLogic(
                    operation = { productRepository.getSubcategories(categoryId) },
                    endpointType = "subcategories"
                )) {
                    is NetworkResult.Success -> {
                        android.util.Log.d("HomeViewModel", "✅ Subcategories loaded successfully: ${result.data?.size ?: 0} items")
                        result.data?.forEach { subcategory ->
                            android.util.Log.d("HomeViewModel", "  - ${subcategory.name} (${subcategory.productCount} products)")
                        }
                        
                        // Check for malformed response (Requirements: 11.4, 11.5)
                        if (result.data == null) {
                            android.util.Log.e("HomeViewModel", "❌ Malformed response: result.data is null")
                            handleMalformedApiResponse("subcategories", result.data)
                            return@launch
                        }
                        
                        // Reorder subcategories based on interaction frequency
                        val reorderedSubcategories = reorderSubcategoriesIfNeeded(result.data)
                        android.util.Log.d("HomeViewModel", "Reordered subcategories: ${reorderedSubcategories.size} items")
                        _uiState.update { 
                            it.copy(subcategoriesState = DataState.Success(reorderedSubcategories)) 
                        }
                        
                        // Auto-select first subcategory and load its products
                        if (reorderedSubcategories.isNotEmpty()) {
                            val firstSubcategory = reorderedSubcategories.first()
                            android.util.Log.d("HomeViewModel", "Auto-selecting first subcategory: ${firstSubcategory.name} (${firstSubcategory.id})")
                            selectSubcategory(firstSubcategory)
                        }
                    }
                    is NetworkResult.Error -> {
                        android.util.Log.e("HomeViewModel", "❌ Failed to load subcategories: ${result.message}")
                        // Enhanced network error handling with graceful degradation (Requirements: 11.4, 11.5)
                        handleApiEndpointFailure("subcategories", result)
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("HomeViewModel", "❌ Exception while loading subcategories", e)
                // Handle unexpected exceptions gracefully (Requirements: 11.5)
                _uiState.update { 
                    it.copy(subcategoriesState = DataState.Error(context.getString(R.string.error_malformed_response))) 
                }
            }
        }
        android.util.Log.d("HomeViewModel", "========================================")
    }
    
    /**
     * Reorder subcategories based on interaction frequency
     * Requirements: 1.5
     */
    private suspend fun reorderSubcategoriesIfNeeded(subcategories: List<com.shambit.customer.data.remote.dto.response.SubcategoryDto>): List<com.shambit.customer.data.remote.dto.response.SubcategoryDto> {
        // Sort by interaction count (descending), then by display order
        return subcategories.sortedWith(
            compareByDescending<com.shambit.customer.data.remote.dto.response.SubcategoryDto> { it.interactionCount }
                .thenBy { it.displayOrder }
        )
    }
    
    /**
     * Select a subcategory and load its products
     * Requirements: 1.2, 1.5
     * 
     * PERFORMANCE FIX: Properly handle filter state when changing subcategories
     */
    fun selectSubcategory(subcategory: com.shambit.customer.data.remote.dto.response.SubcategoryDto) {
        viewModelScope.launch {
            // Track subcategory interaction
            trackSubcategoryTap(subcategory.id)
            
            val currentState = _uiState.value
            val isChangingSubcategory = currentState.selectedSubcategoryId != subcategory.id
            
            // Update selected subcategory
            _uiState.update { 
                it.copy(
                    selectedSubcategoryId = subcategory.id,
                    // Reset product feed state when changing subcategory
                    verticalProductFeedState = DataState.Loading,
                    currentCursor = null,
                    hasMoreProducts = true,
                    // PERFORMANCE FIX: Clear applied filters and load cached filters for new subcategory
                    appliedFilters = if (isChangingSubcategory) emptyMap() else it.appliedFilters,
                    availableFilters = if (isChangingSubcategory) {
                        // Use cached filters if available, otherwise empty until loaded
                        it.filterCache[subcategory.id] ?: emptyList()
                    } else {
                        it.availableFilters
                    }
                ) 
            }
            
            // Load products for this subcategory
            loadProductFeed(subcategoryId = subcategory.id)
        }
    }
    
    /**
     * Track subcategory tap for frequency-based ordering with batched analytics
     * Requirements: 1.5, 18.1
     */
    private suspend fun trackSubcategoryTap(subcategoryId: String) {
        try {
            // Track for frequency-based ordering (existing functionality)
            categoryPreferencesManager.trackCategoryTap(subcategoryId)
            
            // Track with batched analytics for business intelligence
            analyticsBatcher.trackSubcategoryTap(subcategoryId)
        } catch (e: Exception) {
            // Silently handle tracking errors - don't affect user experience
        }
    }
    
    /**
     * Track filter usage patterns and popular combinations
     * Requirements: 18.2
     */
    private suspend fun trackFilterUsage(filters: Map<String, com.shambit.customer.data.remote.dto.response.AppliedFilterValue>) {
        try {
            filters.forEach { (filterType, filterValue) ->
                val filterValues = when (filterValue) {
                    is com.shambit.customer.data.remote.dto.response.AppliedFilterValue.MultiSelect -> filterValue.values
                    is com.shambit.customer.data.remote.dto.response.AppliedFilterValue.Range -> listOf("${filterValue.min}-${filterValue.max}")
                    is com.shambit.customer.data.remote.dto.response.AppliedFilterValue.SingleValue -> listOf(filterValue.value)
                }
                
                analyticsBatcher.trackFilterUsage(filterType, filterValues)
            }
        } catch (e: Exception) {
            // Silently handle tracking errors - don't affect user experience
        }
    }
    
    /**
     * Track scroll engagement and infinite scroll metrics
     * Requirements: 18.3
     */
    private suspend fun trackScrollEngagement(scrollPosition: Int, totalItems: Int, loadMoreTriggered: Boolean) {
        try {
            analyticsBatcher.trackScrollEngagement(scrollPosition, totalItems, loadMoreTriggered)
        } catch (e: Exception) {
            // Silently handle tracking errors - don't affect user experience
        }
    }
    
    /**
     * Track pagination performance metrics
     * Requirements: 18.3
     */
    private suspend fun trackPaginationPerformance(loadTimeMs: Long, itemsLoaded: Int, cursor: String?) {
        try {
            analyticsBatcher.trackPaginationPerformance(loadTimeMs, itemsLoaded, cursor)
        } catch (e: Exception) {
            // Silently handle tracking errors - don't affect user experience
        }
    }
    
    /**
     * Track product impression for analytics
     * Requirements: 18.3
     */
    fun trackProductImpression(productId: String, position: Int, source: String) {
        viewModelScope.launch {
            try {
                analyticsBatcher.trackProductImpression(productId, position, source)
            } catch (e: Exception) {
                // Silently handle tracking errors - don't affect user experience
            }
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
     * Load product feed with cursor pagination and filtering
     * Requirements: 15.2, 15.4, 4.1
     */
    fun loadProductFeed(
        subcategoryId: String? = null,
        cursor: String? = null,
        isLoadMore: Boolean = false
    ) {
        viewModelScope.launch {
            if (isLoadMore) {
                _uiState.update { it.copy(isLoadingMore = true) }
            } else {
                _uiState.update { it.copy(verticalProductFeedState = DataState.Loading) }
            }
            
            val currentState = _uiState.value
            val sortBy = currentState.sortFilterState.sortBy
            val filters = currentState.appliedFilters
            
            try {
                // Use enhanced retry logic with prefetching optimization (Requirements: 11.4, 11.5, 9.4)
                when (val result = retryWithEnhancedLogic(
                    operation = { 
                        if (isLoadMore) {
                            // Use optimized batch loading for pagination
                            getNextBatchOptimized(
                                subcategoryId = subcategoryId ?: currentState.selectedSubcategoryId,
                                cursor = cursor ?: currentState.currentCursor,
                                pageSize = 20,
                                sortBy = sortBy,
                                filters = filters
                            )
                        } else {
                            // Regular loading for initial feed
                            productRepository.getProductFeed(
                                subcategoryId = subcategoryId ?: currentState.selectedSubcategoryId,
                                cursor = cursor ?: currentState.currentCursor,
                                pageSize = 20,
                                sortBy = sortBy,
                                filters = filters
                            )
                        }
                    },
                    endpointType = if (isLoadMore) "pagination" else "product_feed"
                )) {
                    is NetworkResult.Success -> {
                        val response = result.data
                        
                        // Check for malformed response (Requirements: 11.4, 11.5)
                        if (response == null || response.products == null) {
                            handleMalformedApiResponse(
                                if (isLoadMore) "pagination" else "product_feed", 
                                response
                            )
                            return@launch
                        }
                        
                        if (isLoadMore) {
                            // Append new products to existing list
                            val currentProducts = currentState.verticalProductFeedState.getDataOrNull()?.products ?: emptyList()
                            val updatedResponse = response.copy(products = currentProducts + response.products)
                            
                            _uiState.update { 
                                it.copy(
                                    verticalProductFeedState = DataState.Success(updatedResponse),
                                    isLoadingMore = false,
                                    currentCursor = response.cursor,
                                    hasMoreProducts = response.hasMore
                                ) 
                            }
                        } else {
                            // Replace products with new list
                            _uiState.update { 
                                it.copy(
                                    verticalProductFeedState = DataState.Success(response),
                                    isLoadingMore = false,
                                    currentCursor = response.cursor,
                                    hasMoreProducts = response.hasMore
                                ) 
                            }
                        }
                    }
                    is NetworkResult.Error -> {
                        // Enhanced network error handling with graceful degradation (Requirements: 11.4, 11.5)
                        if (isLoadMore) {
                            // For pagination errors, use specific handling
                            handleApiEndpointFailure("pagination", result)
                            _uiState.update { 
                                it.copy(
                                    isLoadingMore = false,
                                    error = enhancedRetryHandler.getRetryMessage(
                                        networkConnectivityManager.analyzeNetworkError(result), context
                                    )
                                ) 
                            }
                        } else {
                            // For initial product feed errors
                            handleApiEndpointFailure("product_feed", result)
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            } catch (e: Exception) {
                // Handle unexpected exceptions gracefully (Requirements: 11.5)
                handleMalformedApiResponse(
                    if (isLoadMore) "pagination" else "product_feed", 
                    null
                )
            }
        }
    }
    
    /**
     * Load more products for infinite scroll
     * Requirements: 4.1, 4.2, 18.3
     */
    fun loadMoreProducts() {
        val currentState = _uiState.value
        if (!currentState.isLoadingMore && currentState.hasMoreProducts && currentState.currentCursor != null) {
            viewModelScope.launch {
                // Track scroll engagement
                val currentProducts = currentState.verticalProductFeedState.getDataOrNull()?.products ?: emptyList()
                trackScrollEngagement(
                    scrollPosition = currentProducts.size,
                    totalItems = currentProducts.size,
                    loadMoreTriggered = true
                )
                
                val startTime = System.currentTimeMillis()
                loadProductFeed(cursor = currentState.currentCursor, isLoadMore = true)
                
                // Track pagination performance after load completes
                val loadTime = System.currentTimeMillis() - startTime
                val newProducts = _uiState.value.verticalProductFeedState.getDataOrNull()?.products ?: emptyList()
                val itemsLoaded = newProducts.size - currentProducts.size
                
                trackPaginationPerformance(loadTime, itemsLoaded, currentState.currentCursor)
            }
        }
    }
    
    /**
     * Prefetch next cursor batch when beneficial for performance optimization
     * Requirements: 9.4 - Add prefetching for next cursor batch when beneficial
     */
    fun prefetchNextBatch() {
        val currentState = _uiState.value
        
        // Only prefetch if:
        // 1. Not currently loading more
        // 2. Has more products available
        // 3. Has a valid cursor
        // 4. Current product list has enough items to justify prefetching (>= 10 items)
        // 5. Network is available
        if (!currentState.isLoadingMore && 
            currentState.hasMoreProducts && 
            currentState.currentCursor != null &&
            currentState.verticalProductFeedState.getDataOrNull()?.products?.size ?: 0 >= 10 &&
            networkConnectivityManager.isNetworkAvailable()) {
            
            viewModelScope.launch {
                try {
                    // Prefetch in background without updating UI loading state
                    val result = productRepository.getProductFeed(
                        subcategoryId = currentState.selectedSubcategoryId,
                        cursor = currentState.currentCursor,
                        pageSize = 20,
                        sortBy = currentState.sortFilterState.sortBy,
                        filters = currentState.appliedFilters
                    )
                    
                    // Cache the prefetched data for immediate use when user scrolls
                    if (result is NetworkResult.Success) {
                        _prefetchedBatch = result.data
                    }
                } catch (e: Exception) {
                    // Silently handle prefetch failures - don't affect user experience
                }
            }
        }
    }
    
    // Cache for prefetched batch
    private var _prefetchedBatch: com.shambit.customer.data.remote.dto.response.ProductFeedResponse? = null
    
    // Scroll position restoration for tab switches
    // Requirements: 9.5 - Implement scroll position restoration for tab switches
    private val _savedScrollPosition = MutableStateFlow<ScrollPosition?>(null)
    val savedScrollPosition: StateFlow<ScrollPosition?> = _savedScrollPosition.asStateFlow()
    
    /**
     * Save current scroll position for restoration
     * Requirements: 9.5 - Implement scroll position restoration for tab switches
     */
    fun saveScrollPosition(firstVisibleItemIndex: Int, firstVisibleItemScrollOffset: Int) {
        _savedScrollPosition.value = ScrollPosition(
            firstVisibleItemIndex = firstVisibleItemIndex,
            firstVisibleItemScrollOffset = firstVisibleItemScrollOffset,
            timestamp = System.currentTimeMillis()
        )
    }
    
    /**
     * Clear saved scroll position (e.g., when user manually scrolls to top)
     * Requirements: 9.5
     */
    fun clearSavedScrollPosition() {
        _savedScrollPosition.value = null
    }
    
    /**
     * Track scroll performance for optimization monitoring
     * Requirements: 9.2, 9.3 - Add performance monitoring for long product lists
     */
    fun trackScrollPerformance(
        firstVisibleItemIndex: Int,
        firstVisibleItemScrollOffset: Int
    ) {
        val currentProducts = _uiState.value.verticalProductFeedState.getDataOrNull()?.products
        val totalItemCount = currentProducts?.size ?: 0
        
        performanceMonitor.trackScrollPerformance(
            firstVisibleItemIndex = firstVisibleItemIndex,
            firstVisibleItemScrollOffset = firstVisibleItemScrollOffset,
            totalItemCount = totalItemCount
        )
        
        // Track memory usage periodically
        if (firstVisibleItemIndex % 10 == 0) {
            performanceMonitor.trackMemoryUsage()
        }
    }
    
    /**
     * Check if saved scroll position is still valid (within 5 minutes)
     * Requirements: 9.5
     */
    fun isSavedScrollPositionValid(): Boolean {
        val saved = _savedScrollPosition.value ?: return false
        val currentTime = System.currentTimeMillis()
        val fiveMinutesInMs = 5 * 60 * 1000L
        return (currentTime - saved.timestamp) < fiveMinutesInMs
    }
    
    /**
     * Get prefetched batch if available, otherwise load normally
     * Requirements: 9.4 - Optimize performance with prefetching
     */
    private suspend fun getNextBatchOptimized(
        subcategoryId: String?,
        cursor: String?,
        pageSize: Int,
        sortBy: SortOption,
        filters: Map<String, com.shambit.customer.data.remote.dto.response.AppliedFilterValue>
    ): NetworkResult<com.shambit.customer.data.remote.dto.response.ProductFeedResponse> {
        // Check if we have a prefetched batch that matches current request
        _prefetchedBatch?.let { prefetched ->
            if (prefetched.cursor == cursor) {
                // Use prefetched data and clear cache
                val result = prefetched
                _prefetchedBatch = null
                return NetworkResult.Success(result)
            }
        }
        
        // No prefetched data available, load normally
        return productRepository.getProductFeed(
            subcategoryId = subcategoryId,
            cursor = cursor,
            pageSize = pageSize,
            sortBy = sortBy,
            filters = filters
        )
    }
    
    /**
     * Load filter options for current subcategory
     * Requirements: 15.4, 2.4
     * 
     * PERFORMANCE FIX: Implements caching to prevent repeated API calls
     */
    fun loadFilterOptions(subcategoryId: String? = null) {
        viewModelScope.launch {
            val targetSubcategoryId = subcategoryId ?: _uiState.value.selectedSubcategoryId
            
            // CRITICAL FIX: Check cache first to prevent repeated API calls
            if (targetSubcategoryId != null) {
                val currentState = _uiState.value
                val cachedFilters = currentState.filterCache[targetSubcategoryId]
                
                if (cachedFilters != null) {
                    // Use cached filters - no API call needed
                    _uiState.update { 
                        it.copy(
                            availableFilters = cachedFilters,
                            lastFilterLoadedSubcategoryId = targetSubcategoryId
                        ) 
                    }
                    return@launch
                }
            }
            
            // Only make API call if not cached
            // Use enhanced retry logic for filters (Requirements: 11.4, 11.5)
            when (val result = retryWithEnhancedLogic(
                operation = { 
                    productRepository.getFilterOptions(targetSubcategoryId) 
                },
                endpointType = "filters"
            )) {
                is NetworkResult.Success -> {
                    // Check for malformed response (Requirements: 11.5)
                    if (result.data == null) {
                        handleMalformedApiResponse("filters", result.data)
                        return@launch
                    }
                    
                    _uiState.update { currentState ->
                        val updatedCache = if (targetSubcategoryId != null) {
                            currentState.filterCache + (targetSubcategoryId to result.data)
                        } else {
                            currentState.filterCache
                        }
                        
                        currentState.copy(
                            availableFilters = result.data,
                            filterCache = updatedCache,
                            lastFilterLoadedSubcategoryId = targetSubcategoryId
                        )
                    }
                }
                is NetworkResult.Error -> {
                    // Enhanced graceful degradation for filter loading (Requirements: 11.4, 11.5)
                    handleApiEndpointFailure("filters", result)
                }
                is NetworkResult.Loading -> {
                    // Loading state
                }
            }
        }
    }
    
    /**
     * Update sort option and reload products
     * Requirements: 2.4, 2.5
     */
    fun updateSortOption(sortOption: SortOption) {
        _uiState.update { 
            it.copy(
                sortFilterState = it.sortFilterState.copy(sortBy = sortOption),
                // Reset pagination when sorting changes
                currentCursor = null,
                hasMoreProducts = true
            ) 
        }
        
        // Reload products with new sort
        loadProductFeed()
    }
    
    /**
     * Apply multiple filters at once and reload products
     * Requirements: 2.5, 18.2
     */
    fun applyFilters(filters: Map<String, com.shambit.customer.data.remote.dto.response.AppliedFilterValue>) {
        viewModelScope.launch {
            // Track filter usage patterns
            trackFilterUsage(filters)
            
            _uiState.update { 
                it.copy(
                    appliedFilters = filters,
                    // Reset pagination when filters change
                    currentCursor = null,
                    hasMoreProducts = true
                ) 
            }
            
            // Reload products with new filters
            loadProductFeed()
        }
    }
    
    /**
     * Apply single filter and reload products
     * Requirements: 2.5
     */
    fun applyFilter(filterType: String, filterValue: com.shambit.customer.data.remote.dto.response.AppliedFilterValue) {
        _uiState.update { 
            it.copy(
                appliedFilters = it.appliedFilters + (filterType to filterValue),
                // Reset pagination when filters change
                currentCursor = null,
                hasMoreProducts = true
            ) 
        }
        
        // Reload products with new filters
        loadProductFeed()
    }
    
    /**
     * Remove filter and reload products
     * Requirements: 2.5
     */
    fun removeFilter(filterType: String) {
        _uiState.update { 
            it.copy(
                appliedFilters = it.appliedFilters - filterType,
                // Reset pagination when filters change
                currentCursor = null,
                hasMoreProducts = true
            ) 
        }
        
        // Reload products with updated filters
        loadProductFeed()
    }
    
    /**
     * Clear all filters and reload products
     * Requirements: 2.5
     */
    fun clearAllFilters() {
        _uiState.update { 
            it.copy(
                appliedFilters = emptyMap(),
                // Reset pagination when filters change
                currentCursor = null,
                hasMoreProducts = true
            ) 
        }
        
        // Reload products without filters
        loadProductFeed()
    }
    
    /**
     * Clear filter cache (useful for refresh or when data becomes stale)
     * PERFORMANCE FIX: Allows cache invalidation when needed
     */
    fun clearFilterCache() {
        _uiState.update { 
            it.copy(
                filterCache = emptyMap(),
                availableFilters = emptyList(),
                lastFilterLoadedSubcategoryId = null
            ) 
        }
    }
    
    /**
     * Show filter bottom sheet
     * Requirements: 2.4
     * 
     * PERFORMANCE FIX: Only load filters once per subcategory to prevent API spam
     */
    fun showFilterBottomSheet() {
        _uiState.update { it.copy(showFilterBottomSheet = true) }
        
        // CRITICAL FIX: Only load filter options if they haven't been loaded yet
        // AND if we have a selected subcategory
        val currentState = _uiState.value
        if (currentState.availableFilters.isEmpty() && 
            currentState.selectedSubcategoryId != null) {
            loadFilterOptions(currentState.selectedSubcategoryId)
        }
    }
    
    /**
     * Hide filter bottom sheet
     * Requirements: 2.4
     */
    fun hideFilterBottomSheet() {
        _uiState.update { it.copy(showFilterBottomSheet = false) }
    }
    
    /**
     * Show sort bottom sheet
     * Requirements: 2.4
     */
    fun showSortBottomSheet() {
        _uiState.update { it.copy(showSortBottomSheet = true) }
    }
    
    /**
     * Hide sort bottom sheet
     * Requirements: 2.4
     */
    fun hideSortBottomSheet() {
        _uiState.update { it.copy(showSortBottomSheet = false) }
    }



    /**
     * Refresh home data (pull-to-refresh)
     * Requirements: 7.3, 10.1
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
                    
                    // Always refresh the vertical product feed
                    val currentState = _uiState.value
                    launch { 
                        // Reload product feed (with or without subcategory)
                        loadProductFeed(subcategoryId = currentState.selectedSubcategoryId)
                    }
                    
                    // Refresh subcategories if a category is selected
                    if (currentState.selectedSubcategoryId != null) {
                        launch { 
                            // Reload subcategories for current category
                            val selectedCategory = currentState.categoriesState.getDataOrNull()
                                ?.find { category -> 
                                    category.subcategories?.any { it.id == currentState.selectedSubcategoryId } == true 
                                }
                            if (selectedCategory != null) {
                                loadSubcategories(selectedCategory.id)
                            }
                        }
                    }
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
     * Update sticky bar visibility based on scroll position
     * Requirements: 2.1, 2.2
     */
    fun updateStickyBarVisibility(visible: Boolean) {
        _uiState.update { 
            it.copy(showStickyBar = visible) 
        }
    }
    
    /**
     * Update scroll-to-top button visibility based on scroll position
     * Requirements: 12.1, 12.2
     */
    fun updateScrollToTopVisibility(visible: Boolean) {
        _uiState.update { 
            it.copy(showScrollToTop = visible) 
        }
    }
    
    /**
     * PERFORMANCE FIX: Batch scroll UI updates to prevent multiple recompositions
     */
    fun updateScrollUIState(stickyBarVisible: Boolean, scrollToTopVisible: Boolean) {
        _uiState.update { 
            it.copy(
                showStickyBar = stickyBarVisible,
                showScrollToTop = scrollToTopVisible
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
    
    /**
     * Retry failed operations with enhanced error handling
     * 
     * Provides intelligent retry logic for failed home screen operations.
     * 
     * Requirements: 3.5, 7.6, 11.3
     */
    fun retryFailedOperations() {
        viewModelScope.launch {
            try {
                // Clear current error state
                _uiState.update { it.copy(error = null) }
                
                // Retry loading home data
                loadHomeData()
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(error = "Retry failed: ${e.message}") 
                }
            }
        }
    }
    
    /**
     * Retry subcategory loading specifically with enhanced network handling
     * Requirements: 10.5, 11.3
     */
    fun retrySubcategoryLoading() {
        viewModelScope.launch {
            val currentState = _uiState.value
            val selectedCategory = currentState.categoriesState.getDataOrNull()
                ?.find { category -> 
                    category.subcategories?.any { it.id == currentState.selectedSubcategoryId } == true 
                }
            
            if (selectedCategory != null) {
                // Use enhanced retry handler for subcategory loading
                _uiState.update { it.copy(subcategoriesState = DataState.Loading) }
                
                val result = enhancedRetryHandler.retrySubcategoryOperation(
                    operation = {
                        productRepository.getSubcategories(selectedCategory.id)
                    }
                )
                
                when (result) {
                    is NetworkResult.Success -> {
                        val reorderedSubcategories = reorderSubcategoriesIfNeeded(result.data)
                        _uiState.update { 
                            it.copy(subcategoriesState = DataState.Success(reorderedSubcategories)) 
                        }
                    }
                    is NetworkResult.Error -> {
                        val analysis = networkConnectivityManager.analyzeNetworkError(result)
                        val errorMessage = enhancedRetryHandler.getRetryMessage(analysis, context)
                        
                        _uiState.update { 
                            it.copy(
                                subcategoriesState = DataState.Error(errorMessage),
                                isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION
                            ) 
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Already in loading state
                    }
                }
            } else {
                // If no specific category, try to reload the first available category's subcategories
                val firstCategory = currentState.categoriesState.getDataOrNull()?.firstOrNull()
                if (firstCategory != null) {
                    loadSubcategories(firstCategory.id)
                }
            }
        }
    }
    
    /**
     * Retry product feed loading specifically with enhanced network handling
     * Requirements: 10.2, 11.1
     */
    fun retryProductFeedLoading() {
        viewModelScope.launch {
            val currentState = _uiState.value
            
            _uiState.update { it.copy(verticalProductFeedState = DataState.Loading) }
            
            val result = enhancedRetryHandler.retryProductFeedOperation(
                operation = {
                    productRepository.getProductFeed(
                        subcategoryId = currentState.selectedSubcategoryId,
                        cursor = null, // Reset pagination on retry
                        pageSize = 20,
                        sortBy = currentState.sortFilterState.sortBy,
                        filters = currentState.appliedFilters
                    )
                }
            )
            
            when (result) {
                is NetworkResult.Success -> {
                    val response = result.data
                    _uiState.update { 
                        it.copy(
                            verticalProductFeedState = DataState.Success(response),
                            currentCursor = response.cursor,
                            hasMoreProducts = response.hasMore
                        ) 
                    }
                }
                is NetworkResult.Error -> {
                    val analysis = networkConnectivityManager.analyzeNetworkError(result)
                    val errorMessage = enhancedRetryHandler.getRetryMessage(analysis)
                    
                    _uiState.update { 
                        it.copy(
                            verticalProductFeedState = DataState.Error(errorMessage),
                            isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION
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
     * Retry filter application specifically with enhanced network handling
     * Requirements: 10.2, 11.1
     */
    fun retryFilterApplication() {
        viewModelScope.launch {
            val currentState = _uiState.value
            
            _uiState.update { it.copy(verticalProductFeedState = DataState.Loading) }
            
            val result = enhancedRetryHandler.retryFilterOperation(
                operation = {
                    productRepository.getProductFeed(
                        subcategoryId = currentState.selectedSubcategoryId,
                        cursor = null, // Reset pagination when retrying filters
                        pageSize = 20,
                        sortBy = currentState.sortFilterState.sortBy,
                        filters = currentState.appliedFilters
                    )
                }
            )
            
            when (result) {
                is NetworkResult.Success -> {
                    val response = result.data
                    _uiState.update { 
                        it.copy(
                            verticalProductFeedState = DataState.Success(response),
                            currentCursor = response.cursor,
                            hasMoreProducts = response.hasMore
                        ) 
                    }
                }
                is NetworkResult.Error -> {
                    val analysis = networkConnectivityManager.analyzeNetworkError(result)
                    val errorMessage = enhancedRetryHandler.getRetryMessage(analysis)
                    
                    _uiState.update { 
                        it.copy(
                            verticalProductFeedState = DataState.Error(errorMessage),
                            isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION
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
     * Handle network connectivity errors with enhanced retry logic
     * Requirements: 11.4, 11.5
     */
    fun handleNetworkError() {
        viewModelScope.launch {
            try {
                // Reset offline state optimistically
                _uiState.update { it.copy(isOffline = false, error = null) }
                
                // Attempt to reload critical data with retry logic
                retryWithBackoff(
                    operation = { loadHomeData() },
                    maxRetries = 3,
                    onFailure = { error ->
                        _uiState.update { 
                            it.copy(
                                isOffline = true,
                                error = context.getString(R.string.error_network_offline)
                            ) 
                        }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isOffline = true,
                        error = context.getString(R.string.error_network_offline)
                    ) 
                }
            }
        }
    }
    
    /**
     * Enhanced offline messaging using existing patterns
     * Requirements: 11.4
     */
    fun handleOfflineState() {
        viewModelScope.launch {
            // Collect network connectivity state
            networkConnectivityManager.isConnected.collect { isConnected ->
                if (!isConnected) {
                    // Show offline messaging using existing patterns
                    _uiState.update { 
                        it.copy(
                            isOffline = true,
                            error = context.getString(R.string.error_network_offline)
                        ) 
                    }
                } else {
                    // Network restored - clear offline state and retry failed operations
                    val currentState = _uiState.value
                    if (currentState.isOffline) {
                        _uiState.update { 
                            it.copy(
                                isOffline = false,
                                error = null
                            ) 
                        }
                        
                        // Retry failed operations using existing patterns
                        retryFailedNetworkOperations()
                    }
                }
            }
        }
    }
    
    /**
     * Retry failed operations when network is restored
     * Requirements: 11.4, 11.5
     */
    private suspend fun retryFailedNetworkOperations() {
        val currentState = _uiState.value
        
        // Retry subcategories if they failed
        if (currentState.subcategoriesState is DataState.Error && 
            currentState.selectedSubcategoryId != null) {
            val selectedCategory = currentState.categoriesState.getDataOrNull()
                ?.find { category -> 
                    category.subcategories?.any { it.id == currentState.selectedSubcategoryId } == true 
                }
            if (selectedCategory != null) {
                loadSubcategories(selectedCategory.id)
            }
        }
        
        // Retry product feed if it failed
        if (currentState.verticalProductFeedState is DataState.Error) {
            loadProductFeed(
                subcategoryId = currentState.selectedSubcategoryId,
                cursor = null, // Start fresh
                isLoadMore = false
            )
        }
        
        // Retry filters if they failed to load
        if (currentState.availableFilters.isEmpty() && 
            currentState.selectedSubcategoryId != null) {
            loadFilterOptions(currentState.selectedSubcategoryId)
        }
    }
    
    /**
     * Enhanced graceful degradation for malformed API responses
     * Requirements: 11.5
     */
    private fun handleMalformedApiResponse(endpointType: String, rawResponse: Any?) {
        when (endpointType) {
            "subcategories" -> {
                // Graceful degradation: Show empty subcategories with helpful message
                _uiState.update { 
                    it.copy(
                        subcategoriesState = DataState.Success(emptyList()),
                        error = context.getString(R.string.empty_subcategories_message)
                    ) 
                }
            }
            "product_feed" -> {
                // Graceful degradation: Show empty product feed with retry option
                _uiState.update { 
                    it.copy(
                        verticalProductFeedState = DataState.Error(
                            context.getString(R.string.error_malformed_response)
                        )
                    ) 
                }
            }
            "filters" -> {
                // Graceful degradation: Hide filter options but keep functionality
                _uiState.update { 
                    it.copy(
                        availableFilters = emptyList(),
                        showFilterBottomSheet = false
                    ) 
                }
            }
            "pagination" -> {
                // Graceful degradation: Stop pagination but keep existing products
                _uiState.update { 
                    it.copy(
                        isLoadingMore = false,
                        hasMoreProducts = false,
                        error = context.getString(R.string.error_load_more_products)
                    ) 
                }
            }
        }
    }
    
    /**
     * Extended retry mechanisms for new API endpoints
     * Requirements: 11.4, 11.5
     */
    suspend fun <T> retryWithEnhancedLogic(
        operation: suspend () -> NetworkResult<T>,
        endpointType: String,
        maxRetries: Int = 3
    ): NetworkResult<T> {
        return when (endpointType) {
            "subcategories" -> enhancedRetryHandler.retrySubcategoryOperation(
                operation = operation,
                maxRetries = maxRetries
            )
            "product_feed" -> enhancedRetryHandler.retryProductFeedOperation(
                operation = operation,
                maxRetries = maxRetries
            )
            "filters" -> enhancedRetryHandler.retryFilterOperation(
                operation = operation,
                maxRetries = maxRetries
            )
            "pagination" -> enhancedRetryHandler.retryPaginationOperation(
                operation = operation,
                maxRetries = maxRetries
            )
            else -> {
                // Default retry logic for unknown endpoints
                var retryCount = 0
                var lastResult: NetworkResult<T>
                
                do {
                    lastResult = operation()
                    if (lastResult is NetworkResult.Success) {
                        return lastResult
                    }
                    
                    if (lastResult is NetworkResult.Error) {
                        val analysis = networkConnectivityManager.analyzeNetworkError(lastResult)
                        if (!NetworkConnectivityHelper.shouldRetryOperation(
                                lastResult, retryCount, maxRetries, 
                                networkConnectivityManager.isNetworkAvailable()
                            )) {
                            break
                        }
                        
                        val delay = NetworkConnectivityHelper.getRetryDelay(lastResult, retryCount)
                        kotlinx.coroutines.delay(delay)
                    }
                    
                    retryCount++
                } while (retryCount < maxRetries)
                
                lastResult
            }
        }
    }
    
    /**
     * Handle malformed API responses gracefully with retry capability
     * Requirements: 11.4, 11.5
     */
    fun handleMalformedResponse(operation: String, retryAction: (() -> Unit)? = null) {
        val errorMessage = context.getString(R.string.error_malformed_response)
        
        _uiState.update { 
            it.copy(error = errorMessage) 
        }
        
        // For malformed responses, we can retry after a delay in case it's temporary
        retryAction?.let { action ->
            viewModelScope.launch {
                kotlinx.coroutines.delay(2000) // Wait 2 seconds before retry
                try {
                    action()
                } catch (e: Exception) {
                    // If retry also fails, keep the error state
                }
            }
        }
    }
    
    /**
     * Enhanced graceful degradation for new API endpoints
     * Requirements: 11.4, 11.5
     */
    fun handleApiEndpointFailure(endpointType: String, error: NetworkResult.Error) {
        val analysis = networkConnectivityManager.analyzeNetworkError(error)
        
        // Check if this is a malformed response and handle accordingly
        if (analysis.errorType == NetworkErrorType.MALFORMED_RESPONSE) {
            handleMalformedApiResponse(endpointType, null)
            return
        }
        
        when (endpointType) {
            "subcategories" -> {
                // Enhanced graceful degradation with better user messaging
                val errorMessage = when (analysis.errorType) {
                    NetworkErrorType.NO_CONNECTION -> context.getString(R.string.error_network_offline)
                    NetworkErrorType.SERVER_ERROR -> context.getString(R.string.error_server_temporarily_unavailable)
                    NetworkErrorType.RATE_LIMITED -> context.getString(R.string.error_too_many_requests)
                    else -> context.getString(R.string.empty_subcategories_message)
                }
                
                _uiState.update { 
                    it.copy(
                        subcategoriesState = if (analysis.errorType == NetworkErrorType.NO_CONNECTION) {
                            DataState.Error(errorMessage)
                        } else {
                            DataState.Success(emptyList()) // Show empty state for non-critical errors
                        },
                        isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION
                    ) 
                }
            }
            "product_feed" -> {
                // Enhanced error messaging with context-aware messages
                val errorMessage = when (analysis.errorType) {
                    NetworkErrorType.NO_CONNECTION -> context.getString(R.string.error_network_offline)
                    NetworkErrorType.SERVER_ERROR -> context.getString(R.string.error_server_temporarily_unavailable)
                    NetworkErrorType.RATE_LIMITED -> context.getString(R.string.error_too_many_requests)
                    NetworkErrorType.NETWORK_ISSUE -> context.getString(R.string.error_connection_timeout)
                    else -> context.getString(R.string.error_product_feed_loading)
                }
                
                _uiState.update { 
                    it.copy(
                        verticalProductFeedState = DataState.Error(errorMessage),
                        isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION
                    ) 
                }
            }
            "filters" -> {
                // Enhanced graceful degradation: Keep filters working with fallback
                when (analysis.errorType) {
                    NetworkErrorType.NO_CONNECTION -> {
                        _uiState.update { 
                            it.copy(
                                availableFilters = emptyList(),
                                showFilterBottomSheet = false,
                                isOffline = true,
                                error = context.getString(R.string.error_network_offline)
                            ) 
                        }
                    }
                    else -> {
                        // For non-critical filter errors, silently degrade
                        _uiState.update { 
                            it.copy(
                                availableFilters = emptyList(),
                                showFilterBottomSheet = false
                            ) 
                        }
                    }
                }
            }
            "pagination" -> {
                // Enhanced pagination error handling with retry capability
                val errorMessage = when (analysis.errorType) {
                    NetworkErrorType.NO_CONNECTION -> context.getString(R.string.error_network_offline)
                    NetworkErrorType.SERVER_ERROR -> context.getString(R.string.error_server_temporarily_unavailable)
                    else -> context.getString(R.string.error_load_more_products)
                }
                
                _uiState.update { 
                    it.copy(
                        isLoadingMore = false,
                        hasMoreProducts = analysis.recommendedAction != RecommendedAction.CHECK_CONNECTION,
                        isOffline = analysis.errorType == NetworkErrorType.NO_CONNECTION,
                        error = errorMessage
                    ) 
                }
            }
        }
    }
    
    /**
     * Retry pagination loading specifically
     * Requirements: 11.2, 4.3
     */
    fun retryPaginationLoading() {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (currentState.hasMoreProducts && currentState.currentCursor != null) {
                loadProductFeed(cursor = currentState.currentCursor, isLoadMore = true)
            }
        }
    }
    
    /**
     * Clear all error states
     */
    fun clearAllErrors() {
        _uiState.update { 
            it.copy(
                error = null,
                snackbarMessage = null,
                isOffline = false
            ) 
        }
    }
    
    /**
     * Enhanced retry mechanism with exponential backoff
     * Requirements: 11.4, 11.5
     */
    private suspend fun retryWithBackoff(
        operation: suspend () -> Unit,
        maxRetries: Int = 3,
        initialDelay: Long = 1000L,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        var retryCount = 0
        var lastException: Exception? = null
        
        while (retryCount < maxRetries) {
            try {
                operation()
                return // Success, exit retry loop
            } catch (e: Exception) {
                lastException = e
                retryCount++
                
                if (retryCount < maxRetries) {
                    // Calculate delay with exponential backoff
                    val delay = initialDelay * 2.0.pow((retryCount - 1).toDouble()).toLong()
                    kotlinx.coroutines.delay(delay.coerceAtMost(30000L)) // Max 30 seconds
                }
            }
        }
        
        // All retries failed
        lastException?.let { onFailure?.invoke(it) }
    }
    
    /**
     * Enhanced retry for specific API endpoints
     * Requirements: 11.4, 11.5
     */
    private suspend fun retryApiCall(
        apiCall: suspend () -> NetworkResult<*>,
        maxRetries: Int = 3,
        onSuccess: () -> Unit,
        onFailure: (NetworkResult.Error) -> Unit
    ) {
        var retryCount = 0
        
        while (retryCount < maxRetries) {
            when (val result = apiCall()) {
                is NetworkResult.Success -> {
                    onSuccess()
                    return
                }
                is NetworkResult.Error -> {
                    if (!NetworkConnectivityHelper.isRetryableError(result) || retryCount >= maxRetries - 1) {
                        onFailure(result)
                        return
                    }
                    
                    // Wait before retry with appropriate delay
                    val delay = NetworkConnectivityHelper.getRetryDelay(result, retryCount)
                    kotlinx.coroutines.delay(delay)
                    retryCount++
                }
                is NetworkResult.Loading -> {
                    // Continue to next iteration
                }
            }
        }
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

/**
 * Scroll position data for restoration
 * Requirements: 9.5 - Implement scroll position restoration for tab switches
 */
data class ScrollPosition(
    val firstVisibleItemIndex: Int,
    val firstVisibleItemScrollOffset: Int,
    val timestamp: Long
)
