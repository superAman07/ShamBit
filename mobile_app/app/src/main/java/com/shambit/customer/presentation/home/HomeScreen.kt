package com.shambit.customer.presentation.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.shambit.customer.ui.components.AdaptiveHeader
import com.shambit.customer.ui.components.ErrorState
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
    onNavigateToCategory: (String) -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    onNavigateToAddressSelection: () -> Unit = {},
    onOpenUrl: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    val listState = rememberLazyListState()
    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    
    // Pull-to-refresh state
    val pullToRefreshState = rememberPullToRefreshState()

    // Calculate scroll offset
    val scrollOffset by remember {
        derivedStateOf {
            listState.firstVisibleItemScrollOffset.toFloat()
        }
    }

    // Update scroll offset in ViewModel
    LaunchedEffect(scrollOffset) {
        viewModel.updateScrollOffset(scrollOffset)
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

    Scaffold(
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
                scrollDirection = uiState.scrollDirection,
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
                uiState.isLoading && uiState.heroBanners.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.heroBanners.isEmpty() -> {
                    ErrorState(
                        message = uiState.error ?: "An error occurred",
                        onRetry = { viewModel.loadHomeData() }
                    )
                }
                else -> {
                    HomeContent(
                        uiState = uiState,
                        listState = listState,
                        onBannerClick = { banner ->
                            when (val action = viewModel.onBannerClick(banner)) {
                                is BannerAction.NavigateToProduct -> onNavigateToProduct(action.productId)
                                is BannerAction.NavigateToCategory -> onNavigateToCategory(action.categoryId)
                                is BannerAction.OpenUrl -> onOpenUrl(action.url)
                                is BannerAction.NavigateToSearch -> onNavigateToSearch()
                                BannerAction.None -> {}
                            }
                        },
                        onCategoryClick = { category ->
                            viewModel.onCategoryTap(category.id)
                            onNavigateToCategory(category.id)
                        },
                        onProductClick = { product ->
                            onNavigateToProduct(product.id)
                        },
                        getCartQuantity = { productId -> 
                            // Force recomposition by reading from uiState
                            viewModel.getCartQuantity(productId)
                        },
                        onAddToCart = { productId -> viewModel.addToCart(productId, 1) },
                        onIncrementCart = { productId -> viewModel.incrementCart(productId) },
                        onDecrementCart = { productId -> viewModel.decrementCart(productId) },
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
    listState: androidx.compose.foundation.lazy.LazyListState,
    onBannerClick: (com.shambit.customer.data.remote.dto.response.BannerDto) -> Unit,
    onCategoryClick: (com.shambit.customer.data.remote.dto.response.CategoryDto) -> Unit = {},
    onProductClick: (com.shambit.customer.data.remote.dto.response.ProductDto) -> Unit = {},
    getCartQuantity: (String) -> Int = { 0 },
    onAddToCart: (String) -> Unit = {},
    onIncrementCart: (String) -> Unit = {},
    onDecrementCart: (String) -> Unit = {},
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager? = null
) {
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize()
    ) {
        // Hero Banner Carousel
        if (uiState.heroBanners.isNotEmpty()) {
            item {
                com.shambit.customer.ui.components.HeroBannerCarousel(
                    banners = uiState.heroBanners,
                    onBannerClick = onBannerClick
                )
            }
        }
        
        // Category Section
        if (uiState.categories.isNotEmpty()) {
            item {
                com.shambit.customer.ui.components.CategorySection(
                    categories = uiState.categories,
                    onCategoryClick = onCategoryClick,
                    hapticFeedback = hapticFeedback
                )
            }
        }
        
        // Promotional Banners Carousel
        if (uiState.promotionalBanners.isNotEmpty()) {
            item {
                com.shambit.customer.ui.components.PromotionalBannerCarousel(
                    banners = uiState.promotionalBanners,
                    onBannerClick = onBannerClick
                )
            }
        }
        
        // Featured Products Section
        item {
            if (uiState.featuredProducts.isNotEmpty()) {
                com.shambit.customer.ui.components.FeaturedProductsSection(
                    products = uiState.featuredProducts,
                    onProductClick = onProductClick,
                    getCartQuantity = getCartQuantity,
                    onAddToCart = { product -> onAddToCart(product.id) },
                    onIncrementCart = { product -> onIncrementCart(product.id) },
                    onDecrementCart = { product -> onDecrementCart(product.id) },
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
                        text = "Featured Products",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "No featured products available. Check logs for details.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }
    }
}
