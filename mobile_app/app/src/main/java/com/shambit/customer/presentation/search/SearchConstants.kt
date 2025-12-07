package com.shambit.customer.presentation.search

/**
 * Constants for Search functionality
 * Centralized configuration for search behavior and UI limits
 */
object SearchConstants {
    
    // ============================================
    // Debounce & Performance Configuration
    // ============================================
    
    /**
     * Delay before triggering full search API call (milliseconds)
     * Prevents excessive API calls while user is typing
     */
    const val SEARCH_DEBOUNCE_MS = 500L
    
    /**
     * Delay before fetching auto-complete suggestions (milliseconds)
     * Shorter than search debounce for faster feedback
     */
    const val SUGGESTION_DEBOUNCE_MS = 300L
    
    /**
     * Delay for local suggestions (milliseconds)
     * Very short for instant feedback from cached data
     */
    const val LOCAL_SUGGESTION_DEBOUNCE_MS = 100L
    
    /**
     * Minimum interval between API calls (milliseconds)
     * Prevents server overload from rapid successive searches
     */
    const val MIN_API_CALL_INTERVAL_MS = 1000L
    
    /**
     * Minimum query length to trigger API-based suggestions
     * Prevents unnecessary API calls for single characters
     */
    const val MIN_QUERY_LENGTH_FOR_API = 2
    
    // ============================================
    // Initial Data Load Configuration
    // ============================================
    
    /**
     * Number of trending products to load on search screen
     */
    const val TRENDING_PRODUCTS_COUNT = 10
    
    /**
     * Number of popular categories to display
     */
    const val POPULAR_CATEGORIES_COUNT = 8
    
    /**
     * Number of frequently searched products to show
     */
    const val FREQUENTLY_SEARCHED_COUNT = 6
    
    /**
     * Number of recommended products to display
     */
    const val RECOMMENDED_PRODUCTS_COUNT = 10
    
    // ============================================
    // Suggestion Configuration
    // ============================================
    
    /**
     * Maximum number of suggestions to display
     */
    const val MAX_SUGGESTIONS = 10
    
    /**
     * Maximum recent searches to include in suggestions
     */
    const val MAX_RECENT_SEARCHES_IN_SUGGESTIONS = 3
    
    /**
     * Maximum category matches to include in suggestions
     */
    const val MAX_CATEGORY_SUGGESTIONS = 3
    
    /**
     * Maximum product matches to include in suggestions
     */
    const val MAX_PRODUCT_SUGGESTIONS = 4
    
    /**
     * Number of smart API-based suggestions to fetch
     */
    const val SMART_SUGGESTIONS_COUNT = 5
    
    // ============================================
    // Display Limits
    // ============================================
    
    /**
     * Maximum recent searches to display in UI
     */
    const val MAX_RECENT_SEARCHES_DISPLAY = 5
    
    /**
     * Maximum trending products to display in horizontal scroll
     */
    const val MAX_TRENDING_DISPLAY = 10
    
    /**
     * Maximum popular categories to display in horizontal scroll
     */
    const val MAX_CATEGORIES_DISPLAY = 8
    
    /**
     * Maximum frequently searched products to display
     */
    const val MAX_FREQUENTLY_SEARCHED_DISPLAY = 6
    
    /**
     * Maximum recommended products to display
     */
    const val MAX_RECOMMENDATIONS_DISPLAY = 10
    
    // ============================================
    // UI Dimensions (dp)
    // ============================================
    
    /**
     * Width of compact product card
     */
    const val COMPACT_CARD_WIDTH_DP = 140
    
    /**
     * Height of product image in compact card
     */
    const val COMPACT_CARD_IMAGE_HEIGHT_DP = 100
    
    /**
     * Width of category chip
     */
    const val CATEGORY_CHIP_WIDTH_DP = 120
    
    /**
     * Search bar corner radius
     */
    const val SEARCH_BAR_CORNER_RADIUS_DP = 28
    
    // ============================================
    // Search Results Configuration
    // ============================================
    
    /**
     * Number of columns in search results grid
     */
    const val SEARCH_RESULTS_GRID_COLUMNS = 2
    
    /**
     * Default page size for search results
     */
    const val SEARCH_RESULTS_PAGE_SIZE = 20
    
    // ============================================
    // Filter Configuration
    // ============================================
    
    /**
     * Price range slider step value
     */
    const val PRICE_SLIDER_STEP = 10.0
    
    /**
     * Minimum price for filter (default)
     */
    const val DEFAULT_MIN_PRICE = 0.0
    
    /**
     * Maximum price for filter (default)
     */
    const val DEFAULT_MAX_PRICE = 10000.0
    
    // ============================================
    // Text Configuration
    // ============================================
    
    /**
     * Placeholder text for search bar
     */
    const val SEARCH_PLACEHOLDER = "Search for products, brands, or categories"
    
    /**
     * Text for empty search results
     */
    const val EMPTY_SEARCH_MESSAGE = "No results found"
    
    /**
     * Text for loading state
     */
    const val LOADING_MESSAGE = "Searching..."
    
    /**
     * Text for initial loading
     */
    const val INITIAL_LOADING_MESSAGE = "Loading..."
}

/**
 * Environment-specific configuration
 * Can be overridden based on build variant or remote config
 */
object SearchConfig {
    
    /**
     * Enable/disable smart API suggestions
     * Can be toggled via remote config for A/B testing
     */
    var enableSmartSuggestions: Boolean = true
    
    /**
     * Enable/disable debouncing
     * Useful for debugging or testing
     */
    var enableDebouncing: Boolean = true
    
    /**
     * Enable/disable API call rate limiting
     * Can be disabled in development for faster testing
     */
    var enableRateLimiting: Boolean = true
    
    /**
     * Custom search debounce time (overrides default if set)
     * Useful for A/B testing different debounce times
     */
    var customSearchDebounceMs: Long? = null
    
    /**
     * Custom suggestion debounce time (overrides default if set)
     */
    var customSuggestionDebounceMs: Long? = null
    
    /**
     * Get effective search debounce time
     */
    fun getSearchDebounceMs(): Long {
        return if (enableDebouncing) {
            customSearchDebounceMs ?: SearchConstants.SEARCH_DEBOUNCE_MS
        } else {
            0L
        }
    }
    
    /**
     * Get effective suggestion debounce time
     */
    fun getSuggestionDebounceMs(): Long {
        return if (enableDebouncing) {
            customSuggestionDebounceMs ?: SearchConstants.SUGGESTION_DEBOUNCE_MS
        } else {
            0L
        }
    }
    
    /**
     * Get effective API call interval
     */
    fun getMinApiCallIntervalMs(): Long {
        return if (enableRateLimiting) {
            SearchConstants.MIN_API_CALL_INTERVAL_MS
        } else {
            0L
        }
    }
    
    /**
     * Reset to default configuration
     */
    fun resetToDefaults() {
        enableSmartSuggestions = true
        enableDebouncing = true
        enableRateLimiting = true
        customSearchDebounceMs = null
        customSuggestionDebounceMs = null
    }
}
