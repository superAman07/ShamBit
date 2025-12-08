# Design Document

## Overview

This design document outlines the technical approach for implementing critical improvements to the ShamBit Android home screen. The improvements focus on six key areas:

1. **Performance Optimization** - Eliminating unnecessary recompositions and implementing parallel data loading
2. **Code Quality** - Removing dead code, extracting string resources, and adding Proguard rules
3. **Visual Polish** - Implementing skeleton screens, optimistic UI updates, and haptic feedback
4. **Image Handling** - Fixing aspect ratios, adding placeholders, and improving content scaling
5. **Architecture** - Implementing composite state management and safe async operations
6. **Content Strategy** - Rich home screen with multiple product sections and discovery features

The design prioritizes high-impact, low-cost changes that improve user experience without over-engineering or increasing hosting costs.

### Home Screen Content Strategy

The home screen will follow a professional e-commerce layout with multiple sections:

1. **Hero Banners** - Promotional carousel (3-5 banners)
2. **Categories** - Horizontal scroll of top-level categories only
3. **Featured Products** - Curated products (10-12 items, horizontal scroll with "View All")
4. **Promotional Banner** - Mid-page promotional content
5. **New Arrivals** - Recently added products (10-12 items, horizontal scroll with "View All")
6. **Best Sellers** - Top-selling products (10-12 items, horizontal scroll with "View All")
7. **Deals of the Day** - Time-limited offers (10-12 items, horizontal scroll with "View All")
8. **Shop by Brand** - Popular brands (horizontal scroll)
9. **Recommended for You** - Personalized recommendations (if available)

Each section uses horizontal scrolling (LazyRow) with a "View All" button that opens a full vertical grid. This approach:
- Keeps home screen fast (no infinite scroll overhead)
- Provides discovery without overwhelming users
- Allows users to dive deep into specific sections
- Reduces initial data load (10-12 items per section vs. paginated hundreds)

## Architecture

### Current Architecture

```
HomeScreen (Composable)
    ├── HomeViewModel (State Management)
    │   ├── BannerRepository
    │   ├── ProductRepository
    │   ├── CartRepository
    │   └── AddressRepository
    └── UI Components
        ├── HeroBannerCarousel
        ├── CategorySection
        ├── PromotionalBannerCarousel
        └── FeaturedProductsSection
```

### Proposed Changes

1. **Scroll State Management**: Move scroll offset from ViewModel to local Composable state
2. **Parallel Data Loading**: Use `async` coroutines for concurrent API calls
3. **Composite UI State**: Replace single error state with per-section Result<T> states
4. **Optimistic Updates**: Add local cart state that updates immediately before server confirmation

## Components and Interfaces

### 1. HomeViewModel Refactoring

**Current Issues:**
- `updateScrollOffset()` triggers unnecessary recompositions
- Sequential data loading (banners → categories → products)
- All-or-nothing error handling
- `runBlocking` usage in token refresh

**Proposed Changes:**

```kotlin
// New composite UI state
data class HomeUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    
    // Per-section states
    val heroBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val categoriesState: DataState<List<CategoryDto>> = DataState.Loading,
    val promotionalBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val featuredProductsState: DataState<List<ProductDto>> = DataState.Loading,
    
    // Cart and address
    val cartItemCount: Int = 0,
    val cartQuantities: Map<String, Int> = emptyMap(),
    val deliveryAddress: String? = null,
    
    // Navigation
    val currentRoute: String = "home"
)

sealed class DataState<out T> {
    object Loading : DataState<Nothing>()
    data class Success<T>(val data: T) : DataState<T>()
    data class Error(val message: String) : DataState<Nothing>()
}
```

**Parallel Data Loading:**

```kotlin
fun loadHomeData() {
    viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true) }
        
        // Launch all requests in parallel
        coroutineScope {
            launch { loadHeroBanners() }
            launch { loadFeaturedCategories() }
            launch { loadPromotionalBanners() }
            launch { loadFeaturedProducts() }
        }
        
        _uiState.update { it.copy(isLoading = false) }
    }
}
```

### 2. HomeScreen Composable Refactoring

**Scroll State Management:**

```kotlin
@Composable
fun HomeScreen(...) {
    val listState = rememberLazyListState()
    
    // Local scroll offset - no ViewModel involvement
    val scrollOffset by remember {
        derivedStateOf {
            listState.firstVisibleItemScrollOffset.toFloat()
        }
    }
    
    // Only pass scroll direction to ViewModel for bottom nav behavior
    val scrollDirection by remember {
        derivedStateOf {
            when {
                scrollOffset > previousOffset -> ScrollDirection.Down
                scrollOffset < previousOffset -> ScrollDirection.Up
                else -> ScrollDirection.None
            }
        }
    }
    
    LaunchedEffect(scrollDirection) {
        viewModel.updateScrollDirection(scrollDirection)
    }
}
```

### 3. Skeleton Screen Implementation

**Component Structure:**

```kotlin
@Composable
fun HomeScreenSkeleton() {
    LazyColumn {
        // Banner skeleton
        item { BannerSkeleton() }
        
        // Category skeleton
        item { CategorySkeleton() }
        
        // Products skeleton
        item { ProductGridSkeleton() }
    }
}

@Composable
private fun BannerSkeleton() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .padding(16.dp)
            .shimmer() // Animated shimmer effect
            .background(
                MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(12.dp)
            )
    )
}
```

### 4. Optimistic Cart Updates

**Implementation:**

```kotlin
// In HomeViewModel
private val _optimisticCartQuantities = MutableStateFlow<Map<String, Int>>(emptyMap())

fun addToCartOptimistic(productId: String) {
    // Update UI immediately
    val currentQty = _optimisticCartQuantities.value[productId] ?: 0
    _optimisticCartQuantities.update { 
        it + (productId to currentQty + 1)
    }
    
    // Then make API call
    viewModelScope.launch {
        when (val result = cartRepository.addToCart(productId, 1)) {
            is NetworkResult.Success -> {
                // Server confirmed, sync optimistic state
                _optimisticCartQuantities.update { it - productId }
            }
            is NetworkResult.Error -> {
                // Revert optimistic update
                _optimisticCartQuantities.update { it - productId }
                _uiState.update { it.copy(error = result.message) }
            }
        }
    }
}

// Merge optimistic and server state
val displayCartQuantities: StateFlow<Map<String, Int>> = combine(
    _uiState,
    _optimisticCartQuantities
) { uiState, optimistic ->
    uiState.cartQuantities + optimistic
}.stateIn(viewModelScope, SharingStarted.Lazily, emptyMap())
```

### 5. Image Component Improvements

**Banner with Aspect Ratio:**

```kotlin
@Composable
private fun BannerCard(
    banner: BannerDto,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f) // Dynamic aspect ratio
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        AsyncImage(
            model = banner.getMobileImage(),
            contentDescription = banner.title,
            contentScale = ContentScale.FillWidth, // Prevent text cropping
            placeholder = painterResource(R.drawable.placeholder_banner),
            error = painterResource(R.drawable.placeholder_banner),
            modifier = Modifier.fillMaxSize()
        )
    }
}
```

**Category Icon with ContentScale.Fit:**

```kotlin
@Composable
fun CategoryCard(category: CategoryDto, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(80.dp)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            AsyncImage(
                model = category.icon,
                contentDescription = category.name,
                contentScale = ContentScale.Fit, // Prevent logo clipping
                placeholder = painterResource(R.drawable.ic_category_placeholder),
                error = painterResource(R.drawable.ic_category_placeholder),
                modifier = Modifier
                    .size(48.dp)
                    .align(Alignment.Center)
            )
        }
        Text(
            text = category.name,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}
```

### 6. Error Handling with Snackbar

**Implementation:**

```kotlin
@Composable
fun HomeScreen(...) {
    val snackbarHostState = remember { SnackbarHostState() }
    val uiState by viewModel.uiState.collectAsState()
    
    // Show non-blocking errors
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                actionLabel = "Retry",
                duration = SnackbarDuration.Short
            )
            viewModel.clearError()
        }
    }
    
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        ...
    ) { ... }
}
```

## Data Models

### Composite UI State

```kotlin
data class HomeUiState(
    // Loading states
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    
    // Per-section data states
    val heroBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val categoriesState: DataState<List<CategoryDto>> = DataState.Loading,
    val promotionalBannersState: DataState<List<BannerDto>> = DataState.Loading,
    val featuredProductsState: DataState<List<ProductDto>> = DataState.Loading,
    
    // Cart state
    val cartItemCount: Int = 0,
    val cartQuantities: Map<String, Int> = emptyMap(),
    
    // Address
    val deliveryAddress: String? = null,
    
    // Navigation
    val currentRoute: String = "home",
    
    // Transient error (for Snackbar)
    val error: String? = null
)

sealed class DataState<out T> {
    object Loading : DataState<Nothing>()
    data class Success<T>(val data: T) : DataState<T>()
    data class Error(val message: String) : DataState<Nothing>()
    
    fun getDataOrNull(): T? = (this as? Success)?.data
    fun isSuccess(): Boolean = this is Success
    fun isError(): Boolean = this is Error
    fun isLoading(): Boolean = this is Loading
}
```

### 7. Category and Subcategory Separation

**Current Issue:**
Categories and subcategories are displayed together in the same horizontal scroll, making navigation confusing.

**Proposed Solution:**

```kotlin
// Update CategoryDto to include subcategories
data class CategoryDto(
    val id: String,
    val name: String,
    val icon: String?,
    val imageUrl: String?,
    val displayOrder: Int,
    val hasSubcategories: Boolean = false, // New field
    val subcategories: List<SubcategoryDto>? = null // New field
)

data class SubcategoryDto(
    val id: String,
    val name: String,
    val parentCategoryId: String,
    val imageUrl: String?,
    val displayOrder: Int
)

// Home screen shows only top-level categories
@Composable
fun CategorySection(
    categories: List<CategoryDto>,
    onCategoryClick: (CategoryDto) -> Unit
) {
    // Filter to show only parent categories
    val parentCategories = categories.filter { !it.hasSubcategories || it.subcategories == null }
    
    LazyRow {
        items(parentCategories) { category ->
            CategoryCard(
                category = category,
                showSubcategoryIndicator = category.hasSubcategories,
                onClick = { onCategoryClick(category) }
            )
        }
    }
}

// Category detail screen shows subcategories
@Composable
fun CategoryDetailScreen(
    category: CategoryDto,
    onSubcategoryClick: (SubcategoryDto) -> Unit
) {
    Column {
        Text(text = category.name, style = MaterialTheme.typography.headlineMedium)
        
        if (category.subcategories?.isNotEmpty() == true) {
            Text("Subcategories", style = MaterialTheme.typography.titleMedium)
            LazyVerticalGrid(columns = GridCells.Fixed(3)) {
                items(category.subcategories) { subcategory ->
                    SubcategoryCard(
                        subcategory = subcategory,
                        onClick = { onSubcategoryClick(subcategory) }
                    )
                }
            }
        }
    }
}
```

### 8. Address Selection Flow Fix

**Current Issue:**
Address selection navigates to cart instead of back to home screen.

**Proposed Solution:**

```kotlin
// Update navigation to pass return destination
@Composable
fun AddressSelectionScreen(
    onAddressSelected: (AddressDto) -> Unit,
    onNavigateBack: () -> Unit,
    returnDestination: String = "home" // New parameter
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Delivery Address") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) {
        LazyColumn {
            items(addresses) { address ->
                AddressCard(
                    address = address,
                    isSelected = address.id == selectedAddressId,
                    onSelect = {
                        viewModel.setActiveAddress(address.id)
                        onAddressSelected(address)
                        // Navigate back to return destination
                        when (returnDestination) {
                            "home" -> navController.navigate("home") {
                                popUpTo("home") { inclusive = false }
                            }
                            "cart" -> navController.navigate("cart")
                        }
                    },
                    onSetDefault = { viewModel.setDefaultAddress(address.id) },
                    onEdit = { navController.navigate("address/edit/${address.id}") }
                )
            }
            
            item {
                Button(
                    onClick = { navController.navigate("address/add") },
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Icon(Icons.Default.Add, "Add")
                    Spacer(Modifier.width(8.dp))
                    Text("Add New Address")
                }
            }
        }
    }
}

// Update HomeScreen header click
ShamBitHeader(
    address = uiState.deliveryAddress,
    onAddressClick = {
        navController.navigate("address/select?return=home")
    }
)
```

### 9. Wishlist Integration

**Current Issue:**
Wishlist functionality exists but is not integrated into product cards across the app.

**Proposed Solution:**

```kotlin
// Create reusable ProductCard component
@Composable
fun ProductCard(
    product: ProductDto,
    isInWishlist: Boolean,
    cartQuantity: Int,
    onProductClick: () -> Unit,
    onWishlistToggle: () -> Unit,
    onAddToCart: () -> Unit,
    onIncrementCart: () -> Unit,
    onDecrementCart: () -> Unit,
    hapticFeedback: HapticFeedbackManager? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onProductClick),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Box {
            Column {
                // Product image
                AsyncImage(
                    model = product.imageUrls.firstOrNull(),
                    contentDescription = product.name,
                    contentScale = ContentScale.Crop,
                    placeholder = painterResource(R.drawable.placeholder_product),
                    error = painterResource(R.drawable.placeholder_product),
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                )
                
                // Product info
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "₹${product.sellingPrice}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (product.mrp > product.sellingPrice) {
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = "₹${product.mrp}",
                                style = MaterialTheme.typography.bodySmall,
                                textDecoration = TextDecoration.LineThrough,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = "${product.discountPercentage}% OFF",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    
                    // Cart controls
                    if (cartQuantity > 0) {
                        CartQuantityControl(
                            quantity = cartQuantity,
                            onIncrement = onIncrementCart,
                            onDecrement = onDecrementCart,
                            hapticFeedback = hapticFeedback
                        )
                    } else {
                        Button(
                            onClick = {
                                hapticFeedback?.performLightImpact()
                                onAddToCart()
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Add to Cart")
                        }
                    }
                }
            }
            
            // Wishlist icon (top-right)
            IconButton(
                onClick = {
                    hapticFeedback?.performLightImpact()
                    onWishlistToggle()
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .background(
                        MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                        CircleShape
                    )
            ) {
                Icon(
                    imageVector = if (isInWishlist) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = if (isInWishlist) "Remove from wishlist" else "Add to wishlist",
                    tint = if (isInWishlist) Color.Red else MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

// Update HomeViewModel to handle wishlist
@HiltViewModel
class HomeViewModel @Inject constructor(
    ...
    private val wishlistRepository: WishlistRepository
) : ViewModel() {
    
    // Observe wishlist state
    val wishlistProductIds: StateFlow<Set<String>> = wishlistRepository
        .getWishlistItems()
        .map { items -> items.map { it.productId }.toSet() }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())
    
    fun toggleWishlist(product: ProductDto) {
        viewModelScope.launch {
            val added = wishlistRepository.toggleWishlist(product)
            _uiState.update {
                it.copy(
                    snackbarMessage = if (added) "Added to wishlist" else "Removed from wishlist"
                )
            }
        }
    }
}
```

### 10. Professional Product Display System

**Unified Product Grid Component:**

```kotlin
@Composable
fun ProductGrid(
    products: List<ProductDto>,
    wishlistProductIds: Set<String>,
    cartQuantities: Map<String, Int>,
    onProductClick: (ProductDto) -> Unit,
    onWishlistToggle: (ProductDto) -> Unit,
    onAddToCart: (ProductDto) -> Unit,
    onIncrementCart: (ProductDto) -> Unit,
    onDecrementCart: (ProductDto) -> Unit,
    isLoading: Boolean = false,
    emptyState: @Composable () -> Unit = { DefaultEmptyState() },
    hapticFeedback: HapticFeedbackManager? = null
) {
    when {
        isLoading -> {
            ProductGridSkeleton()
        }
        products.isEmpty() -> {
            emptyState()
        }
        else -> {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(products, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        isInWishlist = wishlistProductIds.contains(product.id),
                        cartQuantity = cartQuantities[product.id] ?: 0,
                        onProductClick = { onProductClick(product) },
                        onWishlistToggle = { onWishlistToggle(product) },
                        onAddToCart = { onAddToCart(product) },
                        onIncrementCart = { onIncrementCart(product) },
                        onDecrementCart = { onDecrementCart(product) },
                        hapticFeedback = hapticFeedback
                    )
                }
            }
        }
    }
}

@Composable
fun ProductGridSkeleton() {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 160.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(6) {
            ProductCardSkeleton()
        }
    }
}

@Composable
fun DefaultEmptyState() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.ShoppingBag,
            contentDescription = null,
            modifier = Modifier.size(120.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "No products found",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Try adjusting your filters or check back later",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Scroll state locality
*For any* scroll event on the home screen, updating the scroll offset should not trigger a recomposition of the entire screen or ViewModel state updates
**Validates: Requirements 1.1**

### Property 2: Parallel loading independence
*For any* combination of API responses (success/failure), if one data source fails, the other data sources should still load successfully and display their content
**Validates: Requirements 1.3**

### Property 3: Optimistic UI consistency
*For any* cart operation, the UI should update immediately, and if the server operation fails, the UI should revert to the previous state
**Validates: Requirements 3.2**

### Property 4: Image placeholder fallback
*For any* image that fails to load, a placeholder image should be displayed instead of a blank space
**Validates: Requirements 4.2**

### Property 5: String resource usage
*For any* user-facing text in the home screen, the text should come from string resources (strings.xml) and not be hardcoded in Kotlin files
**Validates: Requirements 2.2**

### Property 6: Theme color consistency
*For any* color used in the home screen UI, the color should come from MaterialTheme.colorScheme and not be hardcoded Color values
**Validates: Requirements 9.3**

### Property 7: Proguard DTO preservation
*For any* DTO class used in API responses, the class should either have @Keep annotation or be listed in Proguard rules to prevent obfuscation
**Validates: Requirements 2.3, 9.4**

### Property 8: Category hierarchy separation
*For any* category display, only top-level categories should appear on the home screen, and subcategories should only appear on the category detail screen
**Validates: Requirements 5.1, 5.2**

### Property 9: Address navigation consistency
*For any* address selection from the home screen, the user should return to the home screen after selection, not to the cart screen
**Validates: Requirements 6.6**

### Property 10: Wishlist state consistency
*For any* product across all screens (home, category, search, detail), the wishlist icon state should be consistent and reflect the current wishlist status
**Validates: Requirements 7.2, 7.4**

### Property 11: Product card uniformity
*For any* product display location (home, category, search, wishlist), the product card design and functionality should be identical
**Validates: Requirements 8.1**

## Error Handling

### Per-Section Error Strategy

Instead of failing the entire screen when one API call fails, each section handles its own errors:

```kotlin
@Composable
fun HomeContent(uiState: HomeUiState) {
    LazyColumn {
        // Hero Banners
        when (val state = uiState.heroBannersState) {
            is DataState.Success -> {
                item { HeroBannerCarousel(state.data) }
            }
            is DataState.Error -> {
                // Skip section or show mini error
            }
            is DataState.Loading -> {
                item { BannerSkeleton() }
            }
        }
        
        // Categories
        when (val state = uiState.categoriesState) {
            is DataState.Success -> {
                item { CategorySection(state.data) }
            }
            is DataState.Error -> {
                // Skip section
            }
            is DataState.Loading -> {
                item { CategorySkeleton() }
            }
        }
        
        // Products
        when (val state = uiState.featuredProductsState) {
            is DataState.Success -> {
                item { FeaturedProductsSection(state.data) }
            }
            is DataState.Error -> {
                item { EmptyProductsState(onRetry = { viewModel.loadFeaturedProducts() }) }
            }
            is DataState.Loading -> {
                item { ProductGridSkeleton() }
            }
        }
    }
}
```

### Transient Error Handling

Network errors and cart operation failures are shown as non-blocking Snackbars:

- **Duration**: 3 seconds
- **Action**: "Retry" button when applicable
- **Position**: Bottom of screen (doesn't block content)
- **Auto-dismiss**: Yes

### Token Refresh Safety

Replace `runBlocking` with proper coroutine scope:

```kotlin
// In TokenAuthenticator.kt
class TokenAuthenticator @Inject constructor(
    private val userPreferences: UserPreferences,
    private val authApi: AuthApi
) : Authenticator {
    
    override fun authenticate(route: Route?, response: Response): Request? {
        // Use runBlocking carefully - only for synchronous reads
        val refreshToken = runBlocking {
            userPreferences.getRefreshToken().first()
        } ?: return null
        
        // Make synchronous network call (Authenticator requires sync)
        val newTokenResponse = authApi.refreshToken(refreshToken).execute()
        
        if (newTokenResponse.isSuccessful) {
            val newAccessToken = newTokenResponse.body()?.accessToken
            // Save asynchronously in background
            GlobalScope.launch {
                userPreferences.saveAccessToken(newAccessToken)
            }
            return response.request.newBuilder()
                .header("Authorization", "Bearer $newAccessToken")
                .build()
        }
        
        return null
    }
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **ViewModel State Management**
   - Test parallel data loading completes correctly
   - Test per-section error handling
   - Test optimistic cart updates and rollback

2. **UI Component Rendering**
   - Test skeleton screens render correctly
   - Test empty states display properly
   - Test image placeholders appear on load failure

3. **String Resource Extraction**
   - Verify no hardcoded strings in Kotlin files
   - Test string resource retrieval

### Property-Based Testing

We will use **Kotest Property Testing** library for Android/Kotlin.

**Configuration:**
- Minimum 100 iterations per property test
- Random seed for reproducibility
- Shrinking enabled for minimal failing examples

**Property Test Examples:**

```kotlin
class HomeViewModelPropertyTest : StringSpec({
    
    "Property 2: Parallel loading independence" {
        checkAll(100, Arb.list(Arb.enum<ApiResult>())) { results ->
            val viewModel = createTestViewModel()
            
            // Simulate different API results
            mockApiResponses(results)
            viewModel.loadHomeData()
            
            // At least one success should show content
            val hasAnySuccess = results.any { it == ApiResult.SUCCESS }
            if (hasAnySuccess) {
                viewModel.uiState.value.let { state ->
                    val hasContent = state.heroBannersState.isSuccess() ||
                                   state.categoriesState.isSuccess() ||
                                   state.featuredProductsState.isSuccess()
                    hasContent shouldBe true
                }
            }
        }
    }
    
    "Property 3: Optimistic UI consistency" {
        checkAll(100, Arb.string(), Arb.enum<ApiResult>()) { productId, apiResult ->
            val viewModel = createTestViewModel()
            val initialQty = viewModel.getCartQuantity(productId)
            
            // Add to cart optimistically
            viewModel.addToCartOptimistic(productId)
            
            // UI should update immediately
            viewModel.getCartQuantity(productId) shouldBe initialQty + 1
            
            // Simulate API response
            completeApiCall(apiResult)
            
            // If API failed, should revert
            if (apiResult == ApiResult.ERROR) {
                viewModel.getCartQuantity(productId) shouldBe initialQty
            }
        }
    }
})
```

### Manual Testing Checklist

- [ ] Scroll performance: No lag when scrolling home screen
- [ ] Skeleton screens: Appear immediately on load
- [ ] Parallel loading: All sections load simultaneously
- [ ] Error resilience: One API failure doesn't break entire screen
- [ ] Optimistic cart: Counter updates instantly on tap
- [ ] Haptic feedback: Vibration on cart/wishlist actions
- [ ] Image placeholders: Show on load failure
- [ ] Banner aspect ratio: No text cropping on different screen sizes
- [ ] Category icons: No logo clipping
- [ ] Dark mode: All colors use theme tokens
- [ ] String resources: No hardcoded text visible
- [ ] Proguard: App works correctly in release build

## Implementation Notes

### File Changes Required

**Delete:**
1. `mobile_app/app/src/main/java/com/shambit/customer/HomeScreen.kt` (legacy Activity)

**Modify:**
2. `HomeViewModel.kt` - Add composite state, parallel loading, optimistic updates, wishlist integration
3. `HomeScreen.kt` - Move scroll state to local, add skeleton screens, integrate wishlist
4. `HeroBannerCarousel.kt` - Fix aspect ratio, add placeholders
5. `CategoryCard.kt` - Fix ContentScale to Fit, add subcategory indicator
6. `strings.xml` - Add missing string resources
7. `TokenAuthenticator.kt` - Fix runBlocking usage
8. `AddressSelectionScreen.kt` - Fix navigation to return to home screen
9. `CategoryDto.kt` - Add hasSubcategories and subcategories fields

**Create:**
10. `HomeScreenSkeleton.kt` - Skeleton loading components
11. `EmptyProductsState.kt` - Rich empty state with illustration
12. `proguard-rules.pro` - Add DTO keep rules
13. `ProductCard.kt` - Unified product card component with wishlist
14. `ProductGrid.kt` - Reusable product grid with skeleton and empty states
15. `SubcategoryDto.kt` - Subcategory data model
16. `CategoryDetailScreen.kt` - Screen showing subcategories
17. `ProductCardSkeleton.kt` - Skeleton for product cards
18. `CartQuantityControl.kt` - Reusable cart quantity control component

### Dependencies

No new dependencies required. Using existing:
- Jetpack Compose
- Coil for image loading
- Hilt for DI
- Kotlin Coroutines
- Material 3

### Performance Targets

- **Initial load**: < 500ms to show skeleton
- **Scroll FPS**: 60 FPS minimum
- **Cart update**: < 50ms UI response
- **Parallel loading**: ~50% faster than sequential

### Backward Compatibility

All changes are backward compatible:
- No API changes
- No database migrations
- No breaking changes to existing features
