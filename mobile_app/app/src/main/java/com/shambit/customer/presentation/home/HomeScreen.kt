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
import com.shambit.customer.ui.components.shimmer
import kotlinx.coroutines.launch
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.ui.components.ShamBitPullRefreshIndicator
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
    onOpenUrl: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val wishlistProductIds by viewModel.wishlistProductIds.collectAsState()
    val cartQuantities by viewModel.displayCartQuantities.collectAsState()
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
    
    // Update previous scroll offset and notify ViewModel of direction changes only
    LaunchedEffect(scrollOffset) {
        if (scrollDirection != com.shambit.customer.ui.components.ScrollDirection.None) {
            viewModel.updateScrollDirection(scrollDirection)
        }
        previousScrollOffset = scrollOffset
    }
    
    // Handle pull-to-refresh
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
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
                address = uiState.deliveryAddress,
                cartItemCount = uiState.cartItemCount,
                onAddressClick = onNavigateToAddressSelection,
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
                        hapticFeedback = hapticFeedback
                    )
                }
            }
            
            // Default Material 3 pull-to-refresh indicator
            PullToRefreshContainer(
                state = pullToRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
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
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager? = null
) {
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize()
    ) {
        // Hero Banner Carousel
        when (val state = uiState.heroBannersState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item {
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
                item {
                    BannerSkeleton()
                }
            }
        }
        
        // Category Section
        when (val state = uiState.categoriesState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item {
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
                item {
                    CategorySkeleton()
                }
            }
        }
        
        // Promotional Banners Carousel
        when (val state = uiState.promotionalBannersState) {
            is DataState.Success -> {
                if (state.data.isNotEmpty()) {
                    item {
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
                item {
                    BannerSkeleton()
                }
            }
        }
        
        // Featured Products Section
        when (val state = uiState.featuredProductsState) {
            is DataState.Success -> {
                item {
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
                item {
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
    }
}
