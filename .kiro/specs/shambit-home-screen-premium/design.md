# Design Document

## Architecture Overview

This design extends the existing solid ShamBit home screen architecture with new premium features while maintaining all current functionality and patterns.

### Current Architecture (Preserved)
- **HomeScreen.kt**: Main Composable with Scaffold, navigation, and content sections
- **HomeViewModel.kt**: State management with DataState pattern, optimistic updates, and repository integration
- **DataState.kt**: Loading/Success/Error state management for individual sections
- **HomeScreenSkeleton.kt**: Shimmer loading states for all sections
- **Existing Repositories**: BannerRepository, ProductRepository, CartRepository, WishlistRepository, AddressRepository
- **Existing UI Components**: ShamBitHeader, BottomNavigationBar, CategorySection, HeroBannerCarousel, etc.

### New Architecture Extensions

#### 1. Enhanced HomeUiState (Extend existing)
```kotlin
data class HomeUiState(
    // ... existing fields preserved ...
    
    // NEW: Post-promotional section state
    val subcategoriesState: DataState<List<SubcategoryDto>> = DataState.Loading,
    val selectedSubcategoryId: String? = null,
    val verticalProductFeedState: DataState<ProductFeedResponse> = DataState.Loading,
    val sortFilterState: SortFilterState = SortFilterState(),
    val showStickyBar: Boolean = false,
    val showScrollToTop: Boolean = false,
    
    // NEW: Infinite scroll state
    val isLoadingMore: Boolean = false,
    val hasMoreProducts: Boolean = true,
    val currentCursor: String? = null,
    
    // NEW: Filter state
    val availableFilters: List<FilterOption> = emptyList(),
    val appliedFilters: Map<String, AppliedFilterValue> = emptyMap(),
    val showFilterBottomSheet: Boolean = false
)
```

#### 2. New Data Models
```kotlin
data class SubcategoryDto(
    val id: String,
    val name: String,
    val displayOrder: Int,
    val parentCategoryId: String,
    val interactionCount: Int = 0
)

data class ProductFeedResponse(
    val products: List<ProductDto>,
    val cursor: String?,
    val hasMore: Boolean,
    val totalCount: Int
)

// IMPROVED: Type-safe filter values instead of Any
sealed interface AppliedFilterValue {
    data class MultiSelect(val values: List<String>) : AppliedFilterValue
    data class Range(val min: Int, val max: Int) : AppliedFilterValue
    data class SingleValue(val value: String) : AppliedFilterValue
}

data class FilterOption(
    val type: String, // "price", "rating", "brand", etc.
    val displayName: String,
    val options: List<FilterValue>,
    val selectedValues: List<String> = emptyList()
)

// IMPROVED: Predefined sort options instead of string + direction
enum class SortOption(val displayName: String, val apiValue: String) {
    RELEVANCE("Relevance", "relevance"),
    PRICE_LOW_TO_HIGH("Price: Low to High", "price_low_to_high"),
    PRICE_HIGH_TO_LOW("Price: High to Low", "price_high_to_low"),
    RATING_HIGH_TO_LOW("Rating: High to Low", "rating_high_to_low"),
    NEWEST_FIRST("Newest First", "newest_first"),
    POPULARITY("Most Popular", "popularity")
}

data class SortFilterState(
    val sortBy: SortOption = SortOption.RELEVANCE
)
```

#### 3. Repository Extensions

##### ProductRepository (Extend existing)
```kotlin
// NEW methods to add to existing ProductRepository
suspend fun getSubcategories(categoryId: String): NetworkResult<List<SubcategoryDto>>
suspend fun getProductFeed(
    subcategoryId: String? = null,
    cursor: String? = null,
    pageSize: Int = 20,
    sortBy: SortOption = SortOption.RELEVANCE,
    filters: Map<String, AppliedFilterValue> = emptyMap()
): NetworkResult<ProductFeedResponse>
suspend fun getFilterOptions(subcategoryId: String? = null): NetworkResult<List<FilterOption>>

// HELPER: Convert type-safe filters to API-friendly format
private fun convertFiltersForApi(filters: Map<String, AppliedFilterValue>): Map<String, Any> {
    return filters.mapValues { (_, filterValue) ->
        filterValue.toApiValue()
    }
}
```

##### Filter Conversion Extensions
```kotlin
// IMPROVED: Clean API conversion helper (keeps ViewModel clean)
fun AppliedFilterValue.toApiValue(): Any = when (this) {
    is AppliedFilterValue.MultiSelect -> values
    is AppliedFilterValue.Range -> mapOf("min" to min, "max" to max)
    is AppliedFilterValue.SingleValue -> value
}

// Usage in repository:
private suspend fun callProductFeedApi(
    subcategoryId: String?,
    cursor: String?,
    pageSize: Int,
    sortBy: SortOption,
    filters: Map<String, AppliedFilterValue>
): NetworkResult<ProductFeedResponse> {
    val apiFilters = filters.mapValues { it.value.toApiValue() }
    
    return apiService.getProductFeed(
        subcategoryId = subcategoryId,
        cursor = cursor,
        pageSize = pageSize,
        sortBy = sortBy.apiValue,
        filters = apiFilters // Clean JSON: {"price": {"min": 100, "max": 500}, "brand": ["Nike", "Puma"]}
    )
}
```

##### UserInteractionRepository (Extend existing)
```kotlin
// NEW methods to add to existing user tracking
suspend fun trackSubcategoryTap(subcategoryId: String)
suspend fun getSubcategoryInteractionData(): Map<String, Int>
```

#### 4. New UI Components

##### SubcategoryChipsSection
```kotlin
@Composable
fun SubcategoryChipsSection(
    subcategories: List<SubcategoryDto>,
    selectedId: String?,
    onSubcategorySelected: (SubcategoryDto) -> Unit,
    hapticFeedback: HapticFeedbackManager?
)
```

##### StickyFilterBar
```kotlin
@Composable
fun StickyFilterBar(
    visible: Boolean,
    sortBy: SortOption,
    appliedFilters: Map<String, AppliedFilterValue>,
    onSortClick: () -> Unit,
    onFilterClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // IMPROVED: Clear filter count calculation
    val filterCount = appliedFilters.values.sumOf { filterValue ->
        when (filterValue) {
            is AppliedFilterValue.MultiSelect -> filterValue.values.size
            is AppliedFilterValue.Range -> 1
            is AppliedFilterValue.SingleValue -> 1
        }
    }
    
    // Display: "Sort" and "Filters (X)" where X = total selected filter values
}
```

##### VerticalProductCard
```kotlin
@Composable
fun VerticalProductCard(
    product: ProductDto,
    cartQuantity: Int,
    isInWishlist: Boolean,
    onProductClick: () -> Unit,
    onAddToCart: () -> Unit,
    onIncrementCart: () -> Unit,
    onDecrementCart: () -> Unit,
    onToggleWishlist: () -> Unit,
    hapticFeedback: HapticFeedbackManager?
)
```

##### ScrollToTopButton
```kotlin
@Composable
fun ScrollToTopButton(
    visible: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
)
```

## Implementation Strategy

### Phase 1: Data Layer Extensions (Week 1)
1. **Extend ProductRepository** with new methods for subcategories, product feed, and filters
2. **Add new DTOs** for subcategories, product feed response, and filter options
3. **Extend API endpoints** to support cursor pagination and filtering
4. **Test API integration** thoroughly before UI implementation

### Phase 2: ViewModel Extensions (Week 1-2)
1. **Extend HomeUiState** with new state fields
2. **Add new state management methods** for subcategories, filters, and infinite scroll
3. **Integrate with existing patterns** (DataState, optimistic updates, error handling)
4. **Extend existing category tap tracking** to include subcategories

### Phase 3: UI Components (Week 2-3)
1. **Create SubcategoryChipsSection** with animations and haptic feedback
2. **Build StickyFilterBar** extending existing scroll-aware behavior
3. **Design VerticalProductCard** reusing existing cart/wishlist logic
4. **Implement ScrollToTopButton** with smooth animations

### Phase 4: Integration & Polish (Week 3-4)
1. **Integrate new sections** into existing HomeContent LazyColumn
2. **Add infinite scroll logic** with cursor-based pagination
3. **Implement filter bottom sheet** with API-driven options
4. **Polish animations** and micro-interactions

### Phase 5: Testing & Optimization (Week 4)
1. **Performance testing** on low-end devices
2. **Memory leak detection** for image loading and lazy lists
3. **E2E testing** of complete user flows
4. **Analytics integration** for new features

## Technical Implementation Details

### Infinite Scroll Implementation
```kotlin
// In HomeContent LazyColumn
items(
    count = verticalProducts.size,
    key = { index -> verticalProducts[index].id }
) { index ->
    val product = verticalProducts[index]
    
    // Trigger load more at 80% scroll
    if (index >= verticalProducts.size - 5 && !uiState.isLoadingMore && uiState.hasMoreProducts) {
        LaunchedEffect(Unit) {
            viewModel.loadMoreProducts()
        }
    }
    
    VerticalProductCard(
        product = product,
        // ... existing cart/wishlist integration
    )
}

// Loading more indicator
if (uiState.isLoadingMore) {
    items(3) {
        VerticalProductCardSkeleton()
    }
}
```

### Sticky Bar Scroll Detection
```kotlin
// Extend existing scroll tracking in HomeScreen
val showStickyBar by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > subcategoryChipsIndex ||
        (listState.firstVisibleItemIndex == subcategoryChipsIndex && 
         listState.firstVisibleItemScrollOffset > 100)
    }
}

// IMPROVED: Clear scroll-to-top visibility threshold
val showScrollToTop by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex >= 10 // Clear, predictable threshold
    }
}

LaunchedEffect(showStickyBar) {
    viewModel.updateStickyBarVisibility(showStickyBar)
}

LaunchedEffect(showScrollToTop) {
    viewModel.updateScrollToTopVisibility(showScrollToTop)
}
```

### Memory-Safe Image Loading
```kotlin
// In VerticalProductCard
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(product.imageUrl)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .diskCachePolicy(CachePolicy.ENABLED)
        .size(Size(300, 300)) // Limit image size
        .build(),
    contentDescription = product.name,
    modifier = Modifier
        .fillMaxWidth()
        .height(200.dp)
        .clip(RoundedCornerShape(12.dp))
)
```

## Risk Areas & Monitoring

### 1. Cursor Corruption / Inconsistent Server Ordering
**Risk**: Backend reorders products between pagination calls, causing UX jumps or duplicate items.

**Mitigation**:
- Implement cursor validation on client side
- Add server-side cursor expiration (15-30 minutes)
- Fallback to offset-based pagination if cursor fails
- **CRITICAL**: Ensure backend maintains deterministic ordering (e.g., by product ID as secondary sort)
- QA testing with deliberate backend product reordering

**Monitoring**:
```kotlin
// IMPROVED: Enhanced cursor validation
private fun validateCursor(newProducts: List<ProductDto>, existingProducts: List<ProductDto>): ValidationResult {
    val existingIds = existingProducts.map { it.id }.toSet()
    val duplicates = newProducts.filter { it.id in existingIds }
    
    return when {
        duplicates.isNotEmpty() -> {
            logError("Cursor corruption: Found ${duplicates.size} duplicate products")
            ValidationResult.CORRUPTED
        }
        newProducts.isEmpty() && cursor != null -> {
            logWarning("Empty page with valid cursor - possible end of data")
            ValidationResult.EMPTY_PAGE
        }
        else -> ValidationResult.VALID
    }
}

enum class ValidationResult { VALID, CORRUPTED, EMPTY_PAGE }
```

### 2. Memory Leaks in Lazy List with Images
**Risk**: Large product lists with high-resolution images cause memory pressure and crashes.

**Mitigation**:
- Implement image size limits (max 300x300dp)
- Use memory-efficient image caching
- Monitor bitmap memory usage
- Implement proper LazyColumn recycling

**Monitoring**:
```kotlin
// Add memory monitoring
class MemoryMonitor {
    fun checkMemoryUsage() {
        val runtime = Runtime.getRuntime()
        val usedMemory = runtime.totalMemory() - runtime.freeMemory()
        if (usedMemory > MEMORY_THRESHOLD) {
            // Clear image cache or reduce quality
        }
    }
}
```

### 3. Animation Performance on Low-End Devices
**Risk**: Complex animations cause frame drops and poor user experience, especially when combined.

**Mitigation**:
- Keep animation durations short (160-200ms)
- Use simple transforms only (translate, scale, alpha)
- Test on low-end devices (API 24, 2GB RAM)
- **CRITICAL**: Test combined animations together:
  - List item fade-in + Sticky bar slide + Chip selection animation
- Implement animation disable option for performance mode

**Monitoring**:
```kotlin
// IMPROVED: Comprehensive animation performance monitoring
@Composable
fun MonitoredAnimation(
    animationType: String,
    content: @Composable () -> Unit
) {
    val frameMetrics = remember { FrameMetrics() }
    
    LaunchedEffect(Unit) {
        frameMetrics.startMonitoring(animationType)
    }
    
    DisposableEffect(Unit) {
        onDispose {
            val droppedFrames = frameMetrics.getDroppedFrames()
            if (droppedFrames > ACCEPTABLE_DROPPED_FRAMES) {
                logPerformanceIssue("Animation $animationType dropped $droppedFrames frames")
            }
        }
    }
    
    content()
}

// Test combined animation performance
class AnimationPerformanceTest {
    fun testCombinedAnimations() {
        // Simulate: user scrolls (sticky bar animates) + taps chip (chip animates) + new products load (fade-in)
        // Measure: total frame drops across all simultaneous animations
    }
}
```

### 4. Filter Modal Complexity
**Risk**: Filter options from API don't match UI expectations, causing crashes or poor UX.

**Mitigation**:
- Strict API contract validation with backend team
- Fallback UI for unknown filter types
- Client-side filter option validation
- Comprehensive error handling
- **CRITICAL**: Ensure backend filter spec matches UI expectations exactly

**Monitoring**:
```kotlin
// IMPROVED: Enhanced filter validation with type safety
private fun validateFilterOptions(options: List<FilterOption>): List<FilterOption> {
    return options.mapNotNull { option ->
        when {
            option.type !in SUPPORTED_FILTER_TYPES -> {
                logWarning("Unsupported filter type: ${option.type}")
                null
            }
            option.options.isEmpty() -> {
                logWarning("Empty filter options for: ${option.type}")
                null
            }
            option.displayName.isBlank() -> {
                logWarning("Blank display name for filter: ${option.type}")
                null
            }
            else -> option
        }
    }
}

// Type-safe filter application
private fun applyFilter(filterType: String, value: AppliedFilterValue): Map<String, AppliedFilterValue> {
    return when (filterType) {
        "price" -> mapOf(filterType to value as? AppliedFilterValue.Range ?: return emptyMap())
        "brand", "category" -> mapOf(filterType to value as? AppliedFilterValue.MultiSelect ?: return emptyMap())
        "rating" -> mapOf(filterType to value as? AppliedFilterValue.SingleValue ?: return emptyMap())
        else -> {
            logWarning("Unknown filter type: $filterType")
            emptyMap()
        }
    }
}
```

### 5. Analytics Volume
**Risk**: Product impression tracking per item creates excessive API calls and performance issues.

**Mitigation**:
- Implement batching (send every 10 events or 30 seconds, whichever comes first)
- Use sampling (track 10% of users for detailed analytics)
- Local queuing with retry logic
- Compress analytics payloads

**Monitoring**:
```kotlin
// IMPROVED: Analytics batching with specific batch size
class AnalyticsBatcher {
    companion object {
        private const val BATCH_SIZE = 10 // Specific batch size
        private const val FLUSH_INTERVAL_MS = 30_000L // 30 seconds
    }
    
    private val events = mutableListOf<AnalyticsEvent>()
    private var lastFlushTime = System.currentTimeMillis()
    
    fun trackProductImpression(productId: String) {
        events.add(ProductImpressionEvent(productId, System.currentTimeMillis()))
        
        if (events.size >= BATCH_SIZE || shouldFlushByTime()) {
            flushEvents()
        }
    }
    
    private fun shouldFlushByTime(): Boolean {
        return System.currentTimeMillis() - lastFlushTime >= FLUSH_INTERVAL_MS
    }
}
```

## Testing Strategy

### Property-Based Testing
```kotlin
@Test
fun `product feed pagination maintains order consistency`() = runTest {
    forAll(
        Arb.list(Arb.productDto(), 1..100),
        Arb.int(5..20) // page size
    ) { products, pageSize ->
        val pages = products.chunked(pageSize)
        val reconstructed = mutableListOf<ProductDto>()
        
        pages.forEach { page ->
            reconstructed.addAll(page)
        }
        
        reconstructed == products
    }
}
```

### E2E Smoke Test
```kotlin
@Test
fun `complete user journey smoke test`() = runTest {
    // Load home screen
    homeScreen.waitForLoad()
    
    // Tap subcategory chip
    homeScreen.tapSubcategoryChip("electronics")
    homeScreen.waitForProductFeed()
    
    // Scroll and verify infinite scroll
    homeScreen.scrollToBottom()
    homeScreen.verifyMoreProductsLoaded()
    
    // Add product to cart
    homeScreen.tapAddToCart(firstProduct)
    homeScreen.verifyCartUpdated()
    
    // Navigate away and back
    homeScreen.navigateToProfile()
    homeScreen.navigateToHome()
    
    // Verify scroll position restored
    homeScreen.verifyScrollPositionRestored()
}
```

### Edge Case Testing
```kotlin
@Test
fun `handles edge cases gracefully`() = runTest {
    // Empty product feed
    testEmptyProductFeed()
    
    // Single product
    testSingleProduct()
    
    // Network failures during pagination
    testNetworkFailureDuringPagination()
    
    // Malformed API responses
    testMalformedApiResponses()
}
```

## Performance Benchmarks

### Target Metrics
- **Initial load time**: < 2 seconds for home screen
- **Scroll performance**: 60fps on mid-range devices (API 28+)
- **Memory usage**: < 150MB for 100+ products loaded
- **Image loading**: < 500ms for product images
- **Animation smoothness**: No visible frame drops

### Monitoring Implementation
```kotlin
class PerformanceMonitor {
    fun trackScrollPerformance(lazyListState: LazyListState) {
        // Monitor scroll jank
    }
    
    fun trackMemoryUsage() {
        // Monitor memory consumption
    }
    
    fun trackLoadTimes(operation: String, duration: Long) {
        // Track API and UI load times
    }
}
```

## Deployment Strategy

### Feature Flags
```kotlin
object FeatureFlags {
    const val ENABLE_SUBCATEGORY_CHIPS = "enable_subcategory_chips"
    const val ENABLE_VERTICAL_PRODUCT_FEED = "enable_vertical_product_feed"
    const val ENABLE_INFINITE_SCROLL = "enable_infinite_scroll"
    const val ENABLE_STICKY_FILTER_BAR = "enable_sticky_filter_bar"
}
```

### Rollout Plan
1. **Week 1**: Backend API changes with feature flags
2. **Week 2**: Mobile app with features disabled by default
3. **Week 3**: Gradual rollout (10% → 50% → 100% users)
4. **Week 4**: Full deployment with monitoring

### Rollback Strategy
- Immediate feature flag disable capability
- Fallback to existing home screen functionality
- Database migration rollback procedures
- Client-side error boundaries for new features

This design ensures the new premium features integrate seamlessly with the existing solid architecture while providing comprehensive risk mitigation and testing strategies.