package com.shambit.customer.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shambit.customer.data.local.preferences.UserPreferences
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.data.repository.ProductRepository
import com.shambit.customer.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Sort options for search results
 */
enum class SortOption(val displayName: String) {
    RELEVANCE("Relevance"),
    PRICE_LOW_TO_HIGH("Price: Low to High"),
    PRICE_HIGH_TO_LOW("Price: High to Low"),
    NAME_A_TO_Z("Name: A to Z"),
    NAME_Z_TO_A("Name: Z to A"),
    NEWEST_FIRST("Newest First"),
    RATING("Customer Rating")
}

/**
 * Filter options for search results
 */
data class SearchFilters(
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val selectedCategories: Set<String> = emptySet(),
    val selectedBrands: Set<String> = emptySet(),
    val inStockOnly: Boolean = false,
    val onSaleOnly: Boolean = false,
    val minRating: Double? = null
)

data class SearchUiState(
    val query: String = "",
    val isSearching: Boolean = false,
    val isLoadingInitialData: Boolean = true,
    val isLoadingSuggestions: Boolean = false,
    val searchResults: List<ProductDto> = emptyList(),
    val filteredResults: List<ProductDto> = emptyList(),
    val suggestions: List<String> = emptyList(),
    val smartSuggestions: List<ProductDto> = emptyList(), // API-based product suggestions
    val recentSearches: List<String> = emptyList(),
    val trendingProducts: List<ProductDto> = emptyList(),
    val popularCategories: List<CategoryDto> = emptyList(),
    val frequentlySearched: List<ProductDto> = emptyList(),
    val recommendedProducts: List<ProductDto> = emptyList(),
    val availableBrands: List<String> = emptyList(),
    val availableCategories: List<CategoryDto> = emptyList(),
    val priceRange: Pair<Double, Double>? = null,
    val filters: SearchFilters = SearchFilters(),
    val sortOption: SortOption = SortOption.RELEVANCE,
    val showFilters: Boolean = false,
    val error: String? = null,
    val hasSearched: Boolean = false,
    val lastApiCallTime: Long = 0L,
    val apiCallCount: Int = 0
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val userPreferences: UserPreferences
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()
    
    private var searchJob: Job? = null
    private var suggestionJob: Job? = null
    private var smartSuggestionJob: Job? = null
    
    init {
        loadRecentSearches()
        loadInitialData()
    }
    
    private fun loadRecentSearches() {
        viewModelScope.launch {
            userPreferences.recentSearches.collect { searches ->
                _uiState.update { it.copy(recentSearches = searches) }
            }
        }
    }
    
    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingInitialData = true) }
            
            // Load trending products (featured products)
            when (val trendingResult = productRepository.getFeaturedProducts(
                page = 1,
                pageSize = SearchConstants.TRENDING_PRODUCTS_COUNT
            )) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(trendingProducts = trendingResult.data.products) }
                }
                else -> {}
            }
            
            // Load popular categories
            when (val categoriesResult = productRepository.getFeaturedCategories()) {
                is NetworkResult.Success -> {
                    val categories = categoriesResult.data.take(SearchConstants.POPULAR_CATEGORIES_COUNT)
                    _uiState.update { it.copy(
                        popularCategories = categories,
                        availableCategories = categories
                    ) }
                }
                else -> {}
            }
            
            // Load frequently searched products (using featured as proxy)
            when (val frequentResult = productRepository.getProducts(
                page = 1,
                pageSize = SearchConstants.FREQUENTLY_SEARCHED_COUNT,
                isFeatured = true
            )) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(frequentlySearched = frequentResult.data.products) }
                }
                else -> {}
            }
            
            // Load recommended products (general products)
            when (val recommendedResult = productRepository.getProducts(
                page = 1,
                pageSize = SearchConstants.RECOMMENDED_PRODUCTS_COUNT
            )) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(recommendedProducts = recommendedResult.data.products) }
                }
                else -> {}
            }
            
            _uiState.update { it.copy(isLoadingInitialData = false) }
        }
    }
    
    /**
     * Handle query change with intelligent debouncing
     * - Prevents unnecessary API calls
     * - Shows local suggestions immediately
     * - Fetches smart suggestions from API with debouncing
     */
    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        
        // Clear search results if query is empty
        if (query.isBlank()) {
            _uiState.update { it.copy(
                searchResults = emptyList(),
                filteredResults = emptyList(),
                suggestions = emptyList(),
                smartSuggestions = emptyList(),
                hasSearched = false,
                error = null
            ) }
            searchJob?.cancel()
            suggestionJob?.cancel()
            smartSuggestionJob?.cancel()
            return
        }
        
        // Generate local suggestions immediately (no API call)
        generateLocalSuggestions(query)
        
        // Fetch smart suggestions from API with debouncing
        fetchSmartSuggestions(query)
        
        // Debounce full search with API call prevention
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(SearchConfig.getSearchDebounceMs())
            
            // Check if enough time has passed since last API call
            val currentTime = System.currentTimeMillis()
            val timeSinceLastCall = currentTime - _uiState.value.lastApiCallTime
            val minInterval = SearchConfig.getMinApiCallIntervalMs()
            
            if (timeSinceLastCall < minInterval) {
                // Wait for remaining time to prevent server overload
                delay(minInterval - timeSinceLastCall)
            }
            
            performSearch(query)
        }
    }
    
    /**
     * Generate local suggestions without API call
     * Fast and responsive for immediate feedback
     */
    private fun generateLocalSuggestions(query: String) {
        suggestionJob?.cancel()
        suggestionJob = viewModelScope.launch {
            delay(SearchConstants.LOCAL_SUGGESTION_DEBOUNCE_MS)
            
            val suggestions = mutableListOf<String>()
            
            // Add matching recent searches
            val matchingRecent = _uiState.value.recentSearches
                .filter { it.contains(query, ignoreCase = true) }
                .take(SearchConstants.MAX_RECENT_SEARCHES_IN_SUGGESTIONS)
            suggestions.addAll(matchingRecent)
            
            // Add matching category names
            val matchingCategories = _uiState.value.popularCategories
                .filter { it.name.contains(query, ignoreCase = true) }
                .map { it.name }
                .take(SearchConstants.MAX_CATEGORY_SUGGESTIONS)
            suggestions.addAll(matchingCategories)
            
            // Add matching product names from trending
            val matchingProducts = _uiState.value.trendingProducts
                .filter { it.name.contains(query, ignoreCase = true) }
                .map { it.name }
                .take(SearchConstants.MAX_PRODUCT_SUGGESTIONS)
            suggestions.addAll(matchingProducts)
            
            _uiState.update { it.copy(suggestions = suggestions.distinct().take(SearchConstants.MAX_SUGGESTIONS)) }
        }
    }
    
    /**
     * Fetch smart auto-complete suggestions from API
     * Debounced to prevent excessive API calls
     */
    private fun fetchSmartSuggestions(query: String) {
        if (!SearchConfig.enableSmartSuggestions) return
        if (query.length < SearchConstants.MIN_QUERY_LENGTH_FOR_API) return
        
        smartSuggestionJob?.cancel()
        smartSuggestionJob = viewModelScope.launch {
            delay(SearchConfig.getSuggestionDebounceMs())
            
            _uiState.update { it.copy(isLoadingSuggestions = true) }
            
            // Fetch product suggestions from API
            when (val result = productRepository.searchProducts(
                query,
                page = 1,
                pageSize = SearchConstants.SMART_SUGGESTIONS_COUNT
            )) {
                is NetworkResult.Success -> {
                    _uiState.update { it.copy(
                        smartSuggestions = result.data.products,
                        isLoadingSuggestions = false
                    ) }
                }
                else -> {
                    _uiState.update { it.copy(isLoadingSuggestions = false) }
                }
            }
        }
    }
    
    /**
     * Perform full search with API call tracking
     */
    fun onSearch(query: String = _uiState.value.query) {
        if (query.isBlank()) return
        
        searchJob?.cancel()
        performSearch(query)
        saveRecentSearch(query)
    }
    
    private fun performSearch(query: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(
                isSearching = true,
                error = null,
                lastApiCallTime = System.currentTimeMillis(),
                apiCallCount = _uiState.value.apiCallCount + 1
            ) }
            
            when (val result = productRepository.searchProducts(query)) {
                is NetworkResult.Success -> {
                    val products = result.data.products
                    
                    // Extract available brands and categories from results
                    val brands = products.mapNotNull { it.brandName }.distinct().sorted()
                    val categories = products.mapNotNull { it.category }.distinctBy { it.id }
                    
                    // Calculate price range
                    val prices = products.map { it.sellingPrice }
                    val priceRange = if (prices.isNotEmpty()) {
                        Pair(prices.minOrNull() ?: 0.0, prices.maxOrNull() ?: 0.0)
                    } else null
                    
                    _uiState.update { it.copy(
                        isSearching = false,
                        searchResults = products,
                        filteredResults = products,
                        availableBrands = brands,
                        availableCategories = categories,
                        priceRange = priceRange,
                        hasSearched = true,
                        suggestions = emptyList(),
                        smartSuggestions = emptyList()
                    ) }
                    
                    // Apply current filters and sorting
                    applyFiltersAndSort()
                }
                is NetworkResult.Error -> {
                    _uiState.update { it.copy(
                        isSearching = false,
                        error = result.message,
                        hasSearched = true
                    ) }
                }
                is NetworkResult.Loading -> {}
            }
        }
    }
    
    /**
     * Apply filters to search results
     */
    fun applyFilter(filters: SearchFilters) {
        _uiState.update { it.copy(filters = filters) }
        applyFiltersAndSort()
    }
    
    /**
     * Apply sorting to search results
     */
    fun applySorting(sortOption: SortOption) {
        _uiState.update { it.copy(sortOption = sortOption) }
        applyFiltersAndSort()
    }
    
    /**
     * Apply both filters and sorting to results
     */
    private fun applyFiltersAndSort() {
        val currentState = _uiState.value
        var results = currentState.searchResults
        
        // Apply filters
        val filters = currentState.filters
        
        // Price filter
        if (filters.minPrice != null) {
            results = results.filter { it.sellingPrice >= filters.minPrice }
        }
        if (filters.maxPrice != null) {
            results = results.filter { it.sellingPrice <= filters.maxPrice }
        }
        
        // Category filter
        if (filters.selectedCategories.isNotEmpty()) {
            results = results.filter { product ->
                product.category?.id in filters.selectedCategories
            }
        }
        
        // Brand filter
        if (filters.selectedBrands.isNotEmpty()) {
            results = results.filter { product ->
                product.brandName in filters.selectedBrands
            }
        }
        
        // Stock filter
        if (filters.inStockOnly) {
            results = results.filter { it.isAvailable && it.stockQuantity > 0 }
        }
        
        // Sale filter
        if (filters.onSaleOnly) {
            results = results.filter { it.hasDiscount() }
        }
        
        // Rating filter
        if (filters.minRating != null) {
            results = results.filter { product ->
                (product.averageRating ?: 0.0) >= filters.minRating
            }
        }
        
        // Apply sorting
        results = when (currentState.sortOption) {
            SortOption.RELEVANCE -> results // Keep original order
            SortOption.PRICE_LOW_TO_HIGH -> results.sortedBy { it.sellingPrice }
            SortOption.PRICE_HIGH_TO_LOW -> results.sortedByDescending { it.sellingPrice }
            SortOption.NAME_A_TO_Z -> results.sortedBy { it.name }
            SortOption.NAME_Z_TO_A -> results.sortedByDescending { it.name }
            SortOption.NEWEST_FIRST -> results.sortedByDescending { it.createdAt }
            SortOption.RATING -> results.sortedByDescending { it.averageRating ?: 0.0 }
        }
        
        _uiState.update { it.copy(filteredResults = results) }
    }
    
    /**
     * Toggle filter panel visibility
     */
    fun toggleFilters() {
        _uiState.update { it.copy(showFilters = !it.showFilters) }
    }
    
    /**
     * Clear all filters
     */
    fun clearFilters() {
        _uiState.update { it.copy(filters = SearchFilters()) }
        applyFiltersAndSort()
    }
    
    /**
     * Reset sorting to relevance
     */
    fun resetSorting() {
        _uiState.update { it.copy(sortOption = SortOption.RELEVANCE) }
        applyFiltersAndSort()
    }
    
    private fun saveRecentSearch(query: String) {
        viewModelScope.launch {
            userPreferences.addRecentSearch(query)
        }
    }
    
    fun onRecentSearchClick(query: String) {
        _uiState.update { it.copy(query = query) }
        onSearch(query)
    }
    
    fun onSuggestionClick(suggestion: String) {
        _uiState.update { it.copy(query = suggestion) }
        onSearch(suggestion)
    }
    
    fun clearRecentSearches() {
        viewModelScope.launch {
            userPreferences.clearRecentSearches()
        }
    }
    
    fun clearSearch() {
        _uiState.update { it.copy(
            query = "",
            searchResults = emptyList(),
            filteredResults = emptyList(),
            suggestions = emptyList(),
            smartSuggestions = emptyList(),
            hasSearched = false,
            error = null,
            filters = SearchFilters(),
            sortOption = SortOption.RELEVANCE
        ) }
    }
}
