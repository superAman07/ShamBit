package com.shambit.customer.presentation.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.R
import com.shambit.customer.ui.components.AdaptiveHeader
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.ProductCardSkeleton

import kotlinx.coroutines.launch
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.ui.components.ShamBitPullRefreshIndicator
import com.shambit.customer.ui.components.shimmer
import com.shambit.customer.util.rememberHapticFeedback

/**
 * Home Screen Composable
 * Main entry point for the home screen with adaptive header
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = hiltViewModel(),
    onNavigateToSearch: () -> Unit = {},
    onNavigateToWishlist: () -> Unit = {},
    onNavigateToCart: () -> Unit = {},
    onNavigateToProduct: (String) -> Unit = {},
    onNavigateToCategory: (com.shambit.customer.data.remote.dto.response.CategoryDto) -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    onNavigateToAddressSelection: () -> Unit = {},
    onNavigateToAddNewAddress: () -> Unit = {},
    onNavigateToManageAddresses: () -> Unit = {},
    onOpenUrl: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val wishlistProductIds by viewModel.wishlistProductIds.collectAsState()
    val cartQuantities by viewModel.displayCartQuantities.collectAsState()
    val defaultAddress by viewModel.defaultAddress.collectAsState()
    val showAddressBottomSheet by viewModel.showAddressBottomSheet.collectAsState()
    val savedScrollPosition by viewModel.savedScrollPosition.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    val listState = rememberLazyListState()
    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    
    // Snackbar host state for non-blocking errors
    val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }
    
    // Pull-to-refresh state
    val pullToRefreshState = rememberPullToRefreshState()

    // Local scroll offset - no ViewModel involvement
    val scrollOffset by remember {
        derivedStateOf {
            listState.firstVisibleItemScrollOffset.toFloat()
        }
    }
    
    // Track previous scroll offset for direction calculation
    var previousScrollOffset by remember { mutableStateOf(0f) }
    
    // Calculate scroll direction locally
    val scrollDirection by remember {
        derivedStateOf {
            when {
                scrollOffset > previousScrollOffset -> com.shambit.customer.ui.components.ScrollDirection.Down
                scrollOffset < previousScrollOffset -> com.shambit.customer.ui.components.ScrollDirection.Up
                else -> com.shambit.customer.ui.components.ScrollDirection.None
            }
        }
    }
    
    // Calculate sticky bar and scroll to top visibility based on scroll position
    val showStickyBar by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 100
        }
    }
    
    val showScrollToTop by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 5 || 
            (listState.firstVisibleItemIndex > 0 && listState.firstVisibleItemScrollOffset > 500)
        }
    }
    
    // PERFORMANCE FIX: Combine scroll effects to reduce recompositions
    LaunchedEffect(scrollOffset, showStickyBar, showScrollToTop) {
        // Update scroll direction only when it changes
        if (scrollDirection != com.shambit.customer.ui.components.ScrollDirection.None) {
            viewModel.updateScrollDirection(scrollDirection)
        }
        previousScrollOffset = scrollOffset
        
        // Batch UI state updates to prevent multiple recompositions
        viewModel.updateScrollUIState(
            stickyBarVisible = showStickyBar,
            scrollToTopVisible = showScrollToTop
        )
    }
    
    // Scroll position restoration for tab switches (Requirements: 9.5)
    LaunchedEffect(savedScrollPosition) {
        savedScrollPosition?.let { position ->
            if (viewModel.isSavedScrollPositionValid()) {
                // Restore scroll position when returning to home screen
                listState.scrollToItem(
                    index = position.firstVisibleItemIndex,
                    scrollOffset = position.firstVisibleItemScrollOffset
                )
                // Clear the saved position after restoration
                viewModel.clearSavedScrollPosition()
            }
        }
    }
    
    // Save scroll position when navigating away from home screen (Requirements: 9.5)
    androidx.compose.runtime.DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE -> {
                    // Save current scroll position when leaving home screen
                    viewModel.saveScrollPosition(
                        firstVisibleItemIndex = listState.firstVisibleItemIndex,
                        firstVisibleItemScrollOffset = listState.firstVisibleItemScrollOffset
                    )
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
    
    // PERFORMANCE FIX: Throttle scroll tracking to reduce excessive calls
    LaunchedEffect(listState.firstVisibleItemIndex) {
        // Only track every 5th item to reduce performance overhead
        if (listState.firstVisibleItemIndex % 5 == 0) {
            val currentProducts = uiState.verticalProductFeedState.getDataOrNull()?.products
            if (currentProducts != null && currentProducts.isNotEmpty()) {
                val totalItems = currentProducts.size
                val currentIndex = listState.firstVisibleItemIndex
                
                // Track scroll performance less frequently
                viewModel.trackScrollPerformance(
                    firstVisibleItemIndex = currentIndex,
                    firstVisibleItemScrollOffset = listState.firstVisibleItemScrollOffset
                )
                
                // Trigger prefetch when user is 70% through the current batch
                if (currentIndex >= (totalItems * 0.7).toInt() && uiState.hasMoreProducts) {
                    viewModel.prefetchNextBatch()
                }
            }
        }
    }
    
    // Handle pull-to-refresh
    val refreshingMessage = stringResource(R.string.refreshing_feed)
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            // Show refreshing message (Requirements: 7.3, 10.1)
            snackbarHostState.showSnackbar(
                message = refreshingMessage,
                duration = androidx.compose.material3.SnackbarDuration.Short
            )
            viewModel.refreshHomeData()
        }
    }
    
    // Reset pull-to-refresh state when refresh completes
    LaunchedEffect(uiState.isRefreshing) {
        if (!uiState.isRefreshing) {
            pullToRefreshState.endRefresh()
        }
    }
    
    // Show non-blocking errors in Snackbar
    val retryLabel = stringResource(R.string.retry)
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            val result = snackbarHostState.showSnackbar(
                message = error,
                actionLabel = retryLabel,
                duration = androidx.compose.material3.SnackbarDuration.Short
            )
            
            // Handle retry action
            if (result == androidx.compose.material3.SnackbarResult.ActionPerformed) {
                viewModel.loadHomeData()
            }
            
            // Clear error after showing
            viewModel.clearError()
        }
    }
    
    // Show wishlist action messages in Snackbar
    LaunchedEffect(uiState.snackbarMessage) {
        uiState.snackbarMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = androidx.compose.material3.SnackbarDuration.Short
            )
            
            // Clear snackbar message after showing
            viewModel.clearSnackbarMessage()
        }
    }

    Scaffold(
        snackbarHost = { androidx.compose.material3.SnackbarHost(snackbarHostState) },
        topBar = {
            com.shambit.customer.ui.components.ShamBitHeader(
                address = defaultAddress?.toShortDisplayString(),
                cartItemCount = uiState.cartItemCount,
                onAddressClick = {
                    viewModel.openAddressSelection()
                },
                onSearchClick = {
                    viewModel.updateCurrentRoute(com.shambit.customer.ui.components.NavigationRoutes.SEARCH)
                    onNavigateToSearch()
                },
                onCartClick = {
                    onNavigateToCart()
                },
                onProfileClick = {
                    onNavigateToProfile()
                },
                hapticFeedback = hapticFeedback
            )
        },
        bottomBar = {
            com.shambit.customer.ui.components.BottomNavigationBar(
                selectedRoute = uiState.currentRoute,
                scrollOffset = scrollOffset,
                scrollDirection = scrollDirection,
                onNavigate = { route ->
                    viewModel.updateCurrentRoute(route)
                    when (route) {
                        com.shambit.customer.ui.components.NavigationRoutes.HOME -> {
                            // Already on home, scroll to top
                            coroutineScope.launch {
                                listState.animateScrollToItem(0)
                            }
                        }
                        com.shambit.customer.ui.components.NavigationRoutes.SEARCH -> {
                            onNavigateToSearch()
                        }
                        com.shambit.customer.ui.components.NavigationRoutes.WISHLIST -> {
                            onNavigateToWishlist()
                        }
                        com.shambit.customer.ui.components.NavigationRoutes.PROFILE -> {
                            onNavigateToProfile()
                        }
                    }
                },
                hapticFeedback = hapticFeedback
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .nestedScroll(pullToRefreshState.nestedScrollConnection)
        ) {
            when {
                uiState.isLoading && uiState.heroBannersState.isLoading() -> {
                    // Show skeleton screen instead of generic loading state
                    HomeScreenSkeleton()
                }
                // Only show blocking error state if ALL sections failed to load
                uiState.heroBannersState is DataState.Error && 
                uiState.categoriesState is DataState.Error && 
                uiState.featuredProductsState is DataState.Error -> {
                    ErrorState(
                        message = stringResource(R.string.error_load_content),
                        onRetry = { viewModel.loadHomeData() }
                    )
                }
                else -> {
                    Column {
                        // Show offline banner if offline (Requirements: 11.4, 11.5)
                        if (uiState.isOffline) {
                            com.shambit.customer.ui.components.OfflineErrorState(
                                onRetry = { viewModel.handleNetworkError() },
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                        
                        HomeContent(
                            uiState = uiState,
                            wishlistProductIds = wishlistProductIds,
                            cartQuantities = cartQuantities,
                            listState = listState,
                            onBannerClick = { banner ->
                                when (val action = viewModel.onBannerClick(banner)) {
                                    is BannerAction.NavigateToProduct -> onNavigateToProduct(action.productId)
                                    is BannerAction.NavigateToCategory -> {
                                        // Try to find the category in the current state
                                        val category = (uiState.categoriesState as? DataState.Success)?.data?.find { it.id == action.categoryId }
                                        if (category != null) {
                                            onNavigateToCategory(category)
                                        }
                                        // If category not found in state, we can't determine if it has subcategories
                                        // This is an edge case that shouldn't happen often
                                    }
                                    is BannerAction.OpenUrl -> onOpenUrl(action.url)
                                    is BannerAction.NavigateToSearch -> onNavigateToSearch()
                                    BannerAction.None -> {}
                                }
                            },
                            onCategoryClick = { category ->
                                viewModel.onCategoryTap(category.id)
                                onNavigateToCategory(category)
                            },
                            onProductClick = { product ->
                                onNavigateToProduct(product.id)
                            },
                            onAddToCart = { productId -> viewModel.addToCart(productId, 1) },
                            onIncrementCart = { productId -> viewModel.incrementCart(productId) },
                            onDecrementCart = { productId -> viewModel.decrementCart(productId) },
                            onToggleWishlist = { product -> viewModel.toggleWishlist(product) },
                            onLoadMoreProducts = { viewModel.loadMoreProducts() },
                            onRetryFailedOperations = { viewModel.retryFailedOperations() },
                            onSubcategorySelected = { subcategory -> viewModel.selectSubcategory(subcategory) },
                            onRetrySubcategoryLoading = { viewModel.retrySubcategoryLoading() },
                            onRetryProductFeedLoading = { viewModel.retryProductFeedLoading() },
                            onRetryFilterApplication = { viewModel.retryFilterApplication() },
                            onRetryPaginationLoading = { viewModel.retryPaginationLoading() },
                            onClearAllFilters = { viewModel.clearAllFilters() },
                            onProductImpression = { productId, position, source -> 
                                viewModel.trackProductImpression(productId, position, source) 
                            },
                            hapticFeedback = hapticFeedback
                        )
                    }
                }
            }
            
            // Default Material 3 pull-to-refresh indicator
            PullToRefreshContainer(
                state = pullToRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
            
            // NEW: Sticky Filter Bar Overlay (Requirements: 2.1, 2.2)
            com.shambit.customer.ui.components.StickyFilterBarContainer(
                visible = uiState.showStickyBar,
                sortBy = uiState.sortFilterState.sortBy,
                appliedFilters = uiState.appliedFilters,
                onSortClick = {
                    // PERFORMANCE FIX: Implement sort selection
                    viewModel.showSortBottomSheet()
                },
                onFilterClick = {
                    viewModel.showFilterBottomSheet()
                },
                modifier = Modifier.align(Alignment.TopCenter)
            )
            
            // NEW: Scroll-to-Top Button Overlay (Requirements: 12.1, 12.2)
            com.shambit.customer.ui.components.ScrollToTopButtonContainer(
                visible = uiState.showScrollToTop,
                onClick = {
                    coroutineScope.launch {
                        listState.animateScrollToItem(0)
                    }
                },
                modifier = Modifier.align(Alignment.BottomEnd)
            )
        }
    }
    
    // Address Selection Bottom Sheet
    // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
    if (showAddressBottomSheet) {
        com.shambit.customer.ui.components.AddressSelectionBottomSheet(
            addresses = uiState.addresses ?: emptyList(),
            selectedAddressId = defaultAddress?.id,
            onAddressSelected = { address ->
                viewModel.selectAddress(address)
            },
            onAddNewAddress = {
                viewModel.closeAddressSelection()
                onNavigateToAddNewAddress()
            },
            onManageAddresses = {
                viewModel.closeAddressSelection()
                onNavigateToManageAddresses()
            },
            onDismiss = {
                viewModel.closeAddressSelection()
            }
        )
    }
    
    // NEW: Filter Bottom Sheet (Requirements: 2.4, 5.4)
    if (uiState.showFilterBottomSheet) {
        com.shambit.customer.ui.components.FilterBottomSheet(
            filterOptions = uiState.availableFilters,
            appliedFilters = uiState.appliedFilters,
            onFiltersApplied = { filters ->
                viewModel.applyFilters(filters)
            },
            onClearAllFilters = {
                viewModel.clearAllFilters()
            },
            onDismiss = {
                viewModel.hideFilterBottomSheet()
            }
        )
    }
    
    // NEW: Sort Bottom Sheet (Requirements: 2.4, 2.5)
    if (uiState.showSortBottomSheet) {
        com.shambit.customer.ui.components.SortBottomSheet(
            currentSortOption = uiState.sortFilterState.sortBy,
            onSortSelected = { sortOption ->
                viewModel.updateSortOption(sortOption)
                viewModel.hideSortBottomSheet()
            },
            onDismiss = {
                viewModel.hideSortBottomSheet()
            }
        )
    }
}

/**
 * Home Content
 * Main scrollable content area
 */
@Composable
private fun HomeContent(
    uiState: HomeUiState,
    wishlistProductIds: Set<String>,
    cartQuantities: Map<String, Int>,
    listState: androidx.compose.foundation.lazy.LazyListState,
    onBannerClick: (com.shambit.customer.data.remote.dto.response.BannerDto) -> Unit,
    onCategoryClick: (com.shambit.customer.data.remote.dto.response.CategoryDto) -> Unit = {},
    onProductClick: (com.shambit.customer.data.remote.dto.response.ProductDto) -> Unit = {},
    onAddToCart: (String) -> Unit = {},
    onIncrementCart: (String) -> Unit = {},
    onDecrementCart: (String) -> Unit = {},
    onToggleWishlist: (com.shambit.customer.data.remote.dto.response.ProductDto) -> Unit = {},
    onLoadMoreProducts: () -> Unit = {},
    onRetryFailedOperations: () -> Unit = {},
    onSubcategorySelected: (com.shambit.customer.data.remote.dto.response.SubcategoryDto) -> Unit = {},
    onRetrySubcategoryLoading: () -> Unit = {},
    onRetryProductFeedLoading: () -> Unit = {},
    onRetryFilterApplication: () -> Unit = {},
    onRetryPaginationLoading: () -> Unit = {},
    onClearAllFilters: () -> Unit = {},
    onProductImpression: ((String, Int, String) -> Unit)? = null,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager? = null
) {
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        // Optimize LazyColumn recycling for long product lists (Requirements: 9.4)
        // Note: beyondBoundsItemCount is not available in LazyColumn
        // Enable content padding to improve scroll performance
        contentPadding = PaddingValues(bottom = 16.dp)
    ) {
        // Hero Banner Carousel
        when (val state = uiState.heroBannersState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item(key = "hero_banners") {
                        com.shambit.customer.ui.components.HeroBannerCarousel(
                            banners = state.data,
                            onBannerClick = onBannerClick
                        )
                    }
                }
            }
            is DataState.Error -> {
                // Skip section on error
            }
            is DataState.Loading -> {
                item(key = "hero_banners_loading") {
                    BannerSkeleton()
                }
            }
        }
        
        // Category Section
        when (val state = uiState.categoriesState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item(key = "categories") {
                        com.shambit.customer.ui.components.CategorySection(
                            categories = state.data,
                            onCategoryClick = onCategoryClick,
                            hapticFeedback = hapticFeedback
                        )
                    }
                }
            }
            is DataState.Error -> {
                // Skip section on error
            }
            is DataState.Loading -> {
                item(key = "categories_loading") {
                    CategorySkeleton()
                }
            }
        }
        
        // Promotional Banners Carousel
        when (val state = uiState.promotionalBannersState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item(key = "promotional_banners") {
                        com.shambit.customer.ui.components.PromotionalBannerCarousel(
                            banners = state.data,
                            onBannerClick = onBannerClick
                        )
                    }
                }
            }
            is DataState.Error -> {
                // Skip section on error
            }
            is DataState.Loading -> {
                item(key = "promotional_banners_loading") {
                    BannerSkeleton()
                }
            }
        }
        
        // NEW: Subcategory Chips Section (Requirements: 1.1)
        when (val state = uiState.subcategoriesState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item(key = "subcategory_chips") {
                        com.shambit.customer.ui.components.SubcategoryChipsSection(
                            subcategories = state.data,
                            selectedSubcategoryId = uiState.selectedSubcategoryId,
                            onSubcategorySelected = onSubcategorySelected,
                            hapticFeedback = hapticFeedback
                        )
                    }
                } else {
                    // Empty subcategories state (Requirements: 10.5, 11.3)
                    item(key = "empty_subcategories") {
                        com.shambit.customer.ui.components.EmptySubcategoriesState()
                    }
                }
            }
            is DataState.Error -> {
                // Show error state with retry option (Requirements: 10.5, 11.3)
                item(key = "subcategory_error") {
                    com.shambit.customer.ui.components.SubcategoryErrorState(
                        onRetry = onRetrySubcategoryLoading
                    )
                }
            }
            is DataState.Loading -> {
                item(key = "subcategory_loading") {
                    // Show subcategory chips skeleton
                    com.shambit.customer.ui.components.SubcategoryChipsSkeleton()
                }
            }
        }
        
        // Featured Products Section
        when (val state = uiState.featuredProductsState) {
            is DataState.Success -> {
                item(key = "featured_products") {
                    if (state.data.isNotEmpty()) {
                        com.shambit.customer.ui.components.FeaturedProductsSection(
                            products = state.data,
                            onProductClick = onProductClick,
                            getCartQuantity = { productId -> cartQuantities[productId] ?: 0 },
                            isInWishlist = { productId -> wishlistProductIds.contains(productId) },
                            onAddToCart = { product -> onAddToCart(product.id) },
                            onIncrementCart = { product -> onIncrementCart(product.id) },
                            onDecrementCart = { product -> onDecrementCart(product.id) },
                            onToggleWishlist = onToggleWishlist,
                            hapticFeedback = hapticFeedback
                        )
                    } else {
                        // Debug: Show message when no products
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.featured_products),
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = stringResource(R.string.no_featured_products),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                    }
                }
            }
            is DataState.Error -> {
                // Skip section on error
            }
            is DataState.Loading -> {
                item(key = "featured_products_loading") {
                    // Show horizontal product skeleton
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp)
                    ) {
                        // Section title skeleton
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 16.dp)
                                .width(180.dp)
                                .height(24.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .shimmer()
                        )
                        
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        // Product cards skeleton
                        LazyRow(
                            modifier = Modifier.fillMaxWidth(),
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(4) {
                                ProductCardSkeleton()
                            }
                        }
                    }
                }
            }
        }
        
        // NEW: Vertical Product Feed Section with Infinite Scroll
        when (val state = uiState.verticalProductFeedState) {
            is DataState.Success -> {
                val products = state.data.products
                if (products.isNotEmpty()) {
                    // Section title
                    item(key = "vertical_products_title") {
                        Text(
                            text = stringResource(R.string.more_products),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                    
                    // Vertical product cards with infinite scroll and optimized recycling
                    items(
                        count = products.size,
                        key = { index -> products[index].id },
                        // Optimize item composition for better recycling (Requirements: 9.4)
                        contentType = { "vertical_product_card" }
                    ) { index ->
                        val product = products[index]
                        
                        // Trigger load more at 80% scroll position (Requirements: 4.1)
                        if (index >= products.size - 5 && !uiState.isLoadingMore && uiState.hasMoreProducts) {
                            LaunchedEffect(Unit) {
                                onLoadMoreProducts()
                            }
                        }
                        
                        com.shambit.customer.ui.components.VerticalProductCard(
                            product = product,
                            cartQuantity = cartQuantities[product.id] ?: 0,
                            isInWishlist = wishlistProductIds.contains(product.id),
                            onClick = { onProductClick(product) },
                            onAddToCart = { onAddToCart(product.id) },
                            onIncrementCart = { onIncrementCart(product.id) },
                            onDecrementCart = { onDecrementCart(product.id) },
                            onToggleWishlist = { onToggleWishlist(product) },
                            onProductImpression = onProductImpression,
                            hapticFeedback = hapticFeedback,
                            showFadeInAnimation = index >= products.size - 10, // Show animation for recently loaded items
                            animationIndex = index, // Staggered animation timing
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                    }
                    
                    // Loading more indicator (Requirements: 4.2)
                    if (uiState.isLoadingMore) {
                        items(
                            count = 3,
                            key = { index -> "loading_more_$index" },
                            contentType = { "loading_skeleton" }
                        ) { index ->
                            com.shambit.customer.ui.components.VerticalProductCardSkeleton(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                            )
                        }
                    }
                    
                    // Pagination error state (Requirements: 11.2, 4.3)
                    if (uiState.error != null && uiState.isLoadingMore) {
                        item {
                            com.shambit.customer.ui.components.PaginationErrorState(
                                message = uiState.error!!,
                                onRetry = onRetryPaginationLoading
                            )
                        }
                    }
                    
                    // Polite branding footer when pagination completes (Requirements: 4.4)
                    if (!uiState.hasMoreProducts) {
                        item(key = "branding_footer") {
                            PoliteBrandingFooter(
                                modifier = Modifier.padding(vertical = 24.dp)
                            )
                        }
                    }
                } else {
                    // Empty state - check if filters are applied (Requirements: 10.2, 11.1)
                    if (uiState.appliedFilters.isNotEmpty()) {
                        item(key = "empty_filtered_products") {
                            com.shambit.customer.ui.components.EmptyFilteredProductsState(
                                onClearFilters = onClearAllFilters
                            )
                        }
                    } else {
                        item(key = "empty_product_feed") {
                            com.shambit.customer.ui.components.EmptyProductFeedState()
                        }
                    }
                }
            }
            is DataState.Error -> {
                // Enhanced error state with retry button (Requirements: 10.2, 11.1)
                item(key = "product_feed_error") {
                    // Check if this is a filter application error
                    if (uiState.appliedFilters.isNotEmpty()) {
                        com.shambit.customer.ui.components.FilterApplicationErrorState(
                            message = state.message,
                            onRetry = onRetryFilterApplication,
                            onClearFilters = onClearAllFilters,
                            modifier = Modifier.padding(16.dp)
                        )
                    } else {
                        com.shambit.customer.ui.components.ProductFeedErrorState(
                            message = state.message,
                            onRetry = onRetryProductFeedLoading,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }
            is DataState.Loading -> {
                // Initial loading state
                item(key = "product_feed_loading_title") {
                    Text(
                        text = stringResource(R.string.more_products),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
                items(
                    count = 3,
                    key = { index -> "product_feed_loading_$index" },
                    contentType = { "loading_skeleton" }
                ) { index ->
                    com.shambit.customer.ui.components.VerticalProductCardSkeleton(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}
/**
 * Polite Branding Footer Component
 * Displays when pagination completes (Requirements: 4.4)
 */
@Composable
private fun PoliteBrandingFooter(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = stringResource(R.string.made_with_love_by_shambit),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

/**
 * Product Feed Error State Component
 * Shows error message with retry button (Requirements: 11.2)
 */
@Composable
private fun ProductFeedErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    ErrorState(
        message = message,
        onRetry = onRetry,
        modifier = modifier
    )
}