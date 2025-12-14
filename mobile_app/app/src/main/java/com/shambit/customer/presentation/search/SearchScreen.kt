package com.shambit.customer.presentation.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.CategoryDto
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.ui.components.EmptyState
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.ProductCard
import com.shambit.customer.util.rememberHapticFeedback

/**
 * Enhanced Search Screen with modern eCommerce UX
 * Features:
 * - Professional search box with real-time suggestions
 * - Trending products and categories
 * - Search history
 * - Personalized recommendations
 * - Popular categories
 * - Frequently searched products
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel = hiltViewModel(),
    cartViewModel: com.shambit.customer.presentation.cart.CartViewModel = hiltViewModel(),
    wishlistViewModel: com.shambit.customer.presentation.wishlist.WishlistViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToProduct: (String) -> Unit,
    onNavigateToCategory: (String) -> Unit = {},
    onNavigateToHome: () -> Unit = {},
    onNavigateToWishlist: () -> Unit = {},
    onNavigateToCategories: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val cartState by cartViewModel.uiState.collectAsState()
    val wishlistState by wishlistViewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    
    Scaffold(
        topBar = {
            SearchTopBar(
                query = uiState.query,
                onQueryChange = viewModel::onQueryChange,
                onSearch = { viewModel.onSearch() },
                onClear = viewModel::clearSearch,
                onNavigateBack = onNavigateBack
            )
        },
        bottomBar = {
            com.shambit.customer.ui.components.BottomNavigationBar(
                selectedRoute = "search",
                scrollOffset = 0f,
                scrollDirection = com.shambit.customer.ui.components.ScrollDirection.None,
                onNavigate = { route ->
                    when (route) {
                        com.shambit.customer.ui.components.NavigationRoutes.HOME -> onNavigateToHome()
                        com.shambit.customer.ui.components.NavigationRoutes.CATEGORIES -> onNavigateToCategories()
                        com.shambit.customer.ui.components.NavigationRoutes.WISHLIST -> onNavigateToWishlist()
                        com.shambit.customer.ui.components.NavigationRoutes.PROFILE -> onNavigateToProfile()
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
        ) {
            when {
                uiState.isLoadingInitialData -> {
                    LoadingInitialState()
                }
                uiState.error != null && uiState.hasSearched -> {
                    ErrorState(
                        message = uiState.error!!,
                        onRetry = { viewModel.onSearch() }
                    )
                }
                uiState.hasSearched && uiState.query.isNotBlank() -> {
                    // Show search results with filters
                    SearchResultsWithFilters(
                        viewModel = viewModel,
                        uiState = uiState,
                        cartState = cartState,
                        wishlistState = wishlistState,
                        onProductClick = onNavigateToProduct,
                        onAddToCart = { productId -> cartViewModel.addToCart(productId, 1) },
                        onIncrementCart = cartViewModel::incrementQuantity,
                        onDecrementCart = cartViewModel::decrementQuantity,
                        onToggleWishlist = { productId -> wishlistViewModel.removeFromWishlist(productId) },
                        hapticFeedback = hapticFeedback
                    )
                }
                else -> {
                    // Show discovery content
                    DiscoveryContent(
                        uiState = uiState,
                        cartState = cartState,
                        wishlistState = wishlistState,
                        onRecentSearchClick = viewModel::onRecentSearchClick,
                        onSuggestionClick = viewModel::onSuggestionClick,
                        onClearRecentSearches = viewModel::clearRecentSearches,
                        onProductClick = onNavigateToProduct,
                        onCategoryClick = onNavigateToCategory,
                        onAddToCart = { productId -> cartViewModel.addToCart(productId, 1) },
                        onIncrementCart = cartViewModel::incrementQuantity,
                        onDecrementCart = cartViewModel::decrementQuantity,
                        onToggleWishlist = { productId -> wishlistViewModel.removeFromWishlist(productId) },
                        hapticFeedback = hapticFeedback
                    )
                }
            }
            
            // Auto-suggestions overlay
            AnimatedVisibility(
                visible = uiState.query.isNotBlank() && uiState.suggestions.isNotEmpty() && !uiState.hasSearched,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                SuggestionsOverlay(
                    suggestions = uiState.suggestions,
                    onSuggestionClick = viewModel::onSuggestionClick
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchTopBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onClear: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 4.dp,
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
            
            ProfessionalSearchBar(
                query = query,
                onQueryChange = onQueryChange,
                onSearch = onSearch,
                onClear = onClear,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun ProfessionalSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier,
        placeholder = { 
            Text(
                SearchConstants.SEARCH_PLACEHOLDER,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        leadingIcon = {
            Icon(
                Icons.Default.Search,
                contentDescription = "Search",
                tint = MaterialTheme.colorScheme.primary
            )
        },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = onClear) {
                    Icon(
                        Icons.Default.Clear,
                        contentDescription = "Clear",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        singleLine = true,
        shape = RoundedCornerShape(SearchConstants.SEARCH_BAR_CORNER_RADIUS_DP.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
            focusedContainerColor = MaterialTheme.colorScheme.surface,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    )
}

@Composable
private fun SuggestionsOverlay(
    suggestions: List<String>,
    onSuggestionClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxSize()
            .padding(top = 8.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp
    ) {
        LazyColumn(
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(suggestions) { suggestion ->
                SuggestionItem(
                    suggestion = suggestion,
                    onClick = { onSuggestionClick(suggestion) }
                )
            }
        }
    }
}

@Composable
private fun SuggestionItem(
    suggestion: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = suggestion,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun DiscoveryContent(
    uiState: SearchUiState,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onRecentSearchClick: (String) -> Unit,
    onSuggestionClick: (String) -> Unit,
    onClearRecentSearches: () -> Unit,
    onProductClick: (String) -> Unit,
    onCategoryClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Recent Searches
        if (uiState.recentSearches.isNotEmpty()) {
            item {
                RecentSearchesSection(
                    recentSearches = uiState.recentSearches,
                    onRecentSearchClick = onRecentSearchClick,
                    onClearAll = onClearRecentSearches
                )
            }
        }
        
        // Trending Products
        if (uiState.trendingProducts.isNotEmpty()) {
            item {
                TrendingProductsSection(
                    products = uiState.trendingProducts,
                    cartState = cartState,
                    wishlistState = wishlistState,
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onIncrementCart = onIncrementCart,
                    onDecrementCart = onDecrementCart,
                    onToggleWishlist = onToggleWishlist,
                    hapticFeedback = hapticFeedback
                )
            }
        }
        
        // Popular Categories
        if (uiState.popularCategories.isNotEmpty()) {
            item {
                PopularCategoriesSection(
                    categories = uiState.popularCategories,
                    onCategoryClick = onCategoryClick
                )
            }
        }
        
        // Frequently Searched Products
        if (uiState.frequentlySearched.isNotEmpty()) {
            item {
                FrequentlySearchedSection(
                    products = uiState.frequentlySearched,
                    cartState = cartState,
                    wishlistState = wishlistState,
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onIncrementCart = onIncrementCart,
                    onDecrementCart = onDecrementCart,
                    onToggleWishlist = onToggleWishlist,
                    hapticFeedback = hapticFeedback
                )
            }
        }
        
        // Personalized Recommendations
        if (uiState.recommendedProducts.isNotEmpty()) {
            item {
                RecommendationsSection(
                    products = uiState.recommendedProducts,
                    cartState = cartState,
                    wishlistState = wishlistState,
                    onProductClick = onProductClick,
                    onAddToCart = onAddToCart,
                    onIncrementCart = onIncrementCart,
                    onDecrementCart = onDecrementCart,
                    onToggleWishlist = onToggleWishlist,
                    hapticFeedback = hapticFeedback
                )
            }
        }
    }
}

@Composable
private fun RecentSearchesSection(
    recentSearches: List<String>,
    onRecentSearchClick: (String) -> Unit,
    onClearAll: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "Recent Searches",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            TextButton(onClick = onClearAll) {
                Text("Clear All", fontSize = 13.sp)
            }
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Column(modifier = Modifier.fillMaxWidth()) {
            recentSearches.take(SearchConstants.MAX_RECENT_SEARCHES_DISPLAY).forEach { search ->
                RecentSearchItem(
                    query = search,
                    onClick = { onRecentSearchClick(search) }
                )
            }
        }
    }
}

@Composable
private fun RecentSearchItem(
    query: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = query,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun TrendingProductsSection(
    products: List<ProductDto>,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = "Trending Now",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(products.take(SearchConstants.MAX_TRENDING_DISPLAY)) { product ->
                com.shambit.customer.ui.components.CompactProductCard(
                    product = product,
                    cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                    isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                    onClick = { onProductClick(product.id) },
                    onAddToCart = { onAddToCart(product.id) },
                    onIncrementCart = { onIncrementCart(product.id) },
                    onDecrementCart = { onDecrementCart(product.id) },
                    onToggleWishlist = { onToggleWishlist(product.id) },
                    hapticFeedback = hapticFeedback
                )
            }
        }
    }
}

@Composable
private fun PopularCategoriesSection(
    categories: List<CategoryDto>,
    onCategoryClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Popular Categories",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(categories.take(SearchConstants.MAX_CATEGORIES_DISPLAY)) { category ->
                CategoryChip(
                    category = category,
                    onClick = { onCategoryClick(category.id) }
                )
            }
        }
    }
}

@Composable
private fun CategoryChip(
    category: CategoryDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .width(SearchConstants.CATEGORY_CHIP_WIDTH_DP.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = category.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun FrequentlySearchedSection(
    products: List<ProductDto>,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Frequently Searched",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(products.take(SearchConstants.MAX_FREQUENTLY_SEARCHED_DISPLAY)) { product ->
                com.shambit.customer.ui.components.CompactProductCard(
                    product = product,
                    cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                    isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                    onClick = { onProductClick(product.id) },
                    onAddToCart = { onAddToCart(product.id) },
                    onIncrementCart = { onIncrementCart(product.id) },
                    onDecrementCart = { onDecrementCart(product.id) },
                    onToggleWishlist = { onToggleWishlist(product.id) },
                    hapticFeedback = hapticFeedback
                )
            }
        }
    }
}

@Composable
private fun RecommendationsSection(
    products: List<ProductDto>,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Recommended for You",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            products.take(SearchConstants.MAX_RECOMMENDATIONS_DISPLAY).chunked(2).forEach { rowProducts ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    rowProducts.forEach { product ->
                        Box(modifier = Modifier.weight(1f)) {
                            ProductCard(
                                product = product,
                                cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                                isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                                onClick = { onProductClick(product.id) },
                                onAddToCart = { onAddToCart(product.id) },
                                onIncrementCart = { onIncrementCart(product.id) },
                                onDecrementCart = { onDecrementCart(product.id) },
                                onToggleWishlist = { onToggleWishlist(product.id) },
                                hapticFeedback = hapticFeedback
                            )
                        }
                    }
                    if (rowProducts.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun CompactProductCard(
    product: ProductDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .width(SearchConstants.COMPACT_CARD_WIDTH_DP.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Product image with Coil
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(SearchConstants.COMPACT_CARD_IMAGE_HEIGHT_DP.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                AsyncImage(
                    model = product.getFirstImageUrl(),
                    contentDescription = "Product image: ${product.name}",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
            
            Text(
                text = product.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontSize = 13.sp
            )
            
            Text(
                text = "₹${product.sellingPrice}",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
private fun SearchResultsContent(
    isSearching: Boolean,
    searchResults: List<ProductDto>,
    query: String,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    when {
        isSearching -> {
            LoadingSearchState()
        }
        searchResults.isEmpty() -> {
            EmptySearchState(query = query)
        }
        else -> {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(searchResults, key = { it.id }) { product ->
                    ProductCard(
                        product = product,
                        cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                        isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                        onClick = { onProductClick(product.id) },
                        onAddToCart = { onAddToCart(product.id) },
                        onIncrementCart = { onIncrementCart(product.id) },
                        onDecrementCart = { onDecrementCart(product.id) },
                        onToggleWishlist = { onToggleWishlist(product.id) },
                        hapticFeedback = hapticFeedback
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchResultsWithFilters(
    viewModel: SearchViewModel,
    uiState: SearchUiState,
    cartState: com.shambit.customer.presentation.cart.CartUiState,
    wishlistState: com.shambit.customer.presentation.wishlist.WishlistUiState,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onIncrementCart: (String) -> Unit,
    onDecrementCart: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?,
    modifier: Modifier = Modifier
) {
    var showSortSheet by remember { mutableStateOf(false) }
    var showFilterSheet by remember { mutableStateOf(false) }
    
    Column(modifier = modifier.fillMaxSize()) {
        // Filter and Sort Bar
        FilterSortBar(
            resultCount = uiState.filteredResults.size,
            sortOption = uiState.sortOption,
            hasActiveFilters = uiState.filters != SearchFilters(),
            onFilterClick = { showFilterSheet = true },
            onSortClick = { showSortSheet = true }
        )
        
        // Results Grid
        when {
            uiState.isSearching -> {
                LoadingSearchState()
            }
            uiState.filteredResults.isEmpty() -> {
                EmptySearchState(query = uiState.query)
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.filteredResults, key = { it.id }) { product ->
                        ProductCard(
                            product = product,
                            cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                            isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                            onClick = { onProductClick(product.id) },
                            onAddToCart = { onAddToCart(product.id) },
                            onIncrementCart = { onIncrementCart(product.id) },
                            onDecrementCart = { onDecrementCart(product.id) },
                            onToggleWishlist = { onToggleWishlist(product.id) },
                            hapticFeedback = hapticFeedback
                        )
                    }
                }
            }
        }
    }
    
    // Sort Bottom Sheet
    if (showSortSheet) {
        SortBottomSheet(
            currentSort = uiState.sortOption,
            onSortSelected = viewModel::applySorting,
            onDismiss = { showSortSheet = false }
        )
    }
    
    // Filter Bottom Sheet
    if (showFilterSheet) {
        FilterBottomSheet(
            filters = uiState.filters,
            availableBrands = uiState.availableBrands,
            availableCategories = uiState.availableCategories,
            priceRange = uiState.priceRange,
            onFiltersChanged = viewModel::applyFilter,
            onClearFilters = viewModel::clearFilters,
            onDismiss = { showFilterSheet = false }
        )
    }
}

@Composable
private fun LoadingInitialState(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator()
            Text(
                text = SearchConstants.INITIAL_LOADING_MESSAGE,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun LoadingSearchState(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator()
            Text(
                text = SearchConstants.LOADING_MESSAGE,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun EmptySearchState(
    query: String,
    modifier: Modifier = Modifier
) {
    EmptyState(
        message = "No results found for \"$query\"",
        modifier = modifier
    )
}

/**
 * Filter and Sort Bar for Search Results
 */
@Composable
private fun FilterSortBar(
    resultCount: Int,
    sortOption: SortOption,
    hasActiveFilters: Boolean,
    onFilterClick: () -> Unit,
    onSortClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$resultCount results",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Filter Button
                FilterChip(
                    selected = hasActiveFilters,
                    onClick = onFilterClick,
                    label = { Text("Filter") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Filter",
                            modifier = Modifier.size(18.dp)
                        )
                    }
                )
                
                // Sort Button
                FilterChip(
                    selected = sortOption != SortOption.RELEVANCE,
                    onClick = onSortClick,
                    label = { Text("Sort") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = "Sort",
                            modifier = Modifier.size(18.dp)
                        )
                    }
                )
            }
        }
    }
}

/**
 * Sort Options Bottom Sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SortBottomSheet(
    currentSort: SortOption,
    onSortSelected: (SortOption) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Text(
                text = "Sort By",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            
            SortOption.values().forEach { option ->
                SortOptionItem(
                    option = option,
                    isSelected = option == currentSort,
                    onClick = {
                        onSortSelected(option)
                        onDismiss()
                    }
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SortOptionItem(
    option: SortOption,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = option.displayName,
            style = MaterialTheme.typography.bodyLarge,
            color = if (isSelected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurface
            },
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
        )
        
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Selected",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

/**
 * Filter Bottom Sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterBottomSheet(
    filters: SearchFilters,
    availableBrands: List<String>,
    availableCategories: List<CategoryDto>,
    priceRange: Pair<Double, Double>?,
    onFiltersChanged: (SearchFilters) -> Unit,
    onClearFilters: () -> Unit,
    onDismiss: () -> Unit
) {
    var tempFilters by remember { mutableStateOf(filters) }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Filters",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    TextButton(onClick = {
                        tempFilters = SearchFilters()
                        onClearFilters()
                    }) {
                        Text("Clear All")
                    }
                }
                
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }
            
            // Price Range Filter
            if (priceRange != null) {
                item {
                    PriceRangeFilter(
                        minPrice = tempFilters.minPrice ?: priceRange.first,
                        maxPrice = tempFilters.maxPrice ?: priceRange.second,
                        priceRange = priceRange,
                        onPriceRangeChanged = { min, max ->
                            tempFilters = tempFilters.copy(minPrice = min, maxPrice = max)
                        }
                    )
                }
            }
            
            // Category Filter
            if (availableCategories.isNotEmpty()) {
                item {
                    CategoryFilter(
                        categories = availableCategories,
                        selectedCategories = tempFilters.selectedCategories,
                        onCategoryToggle = { categoryId ->
                            val newSelection = if (categoryId in tempFilters.selectedCategories) {
                                tempFilters.selectedCategories - categoryId
                            } else {
                                tempFilters.selectedCategories + categoryId
                            }
                            tempFilters = tempFilters.copy(selectedCategories = newSelection)
                        }
                    )
                }
            }
            
            // Brand Filter
            if (availableBrands.isNotEmpty()) {
                item {
                    BrandFilter(
                        brands = availableBrands,
                        selectedBrands = tempFilters.selectedBrands,
                        onBrandToggle = { brand ->
                            val newSelection = if (brand in tempFilters.selectedBrands) {
                                tempFilters.selectedBrands - brand
                            } else {
                                tempFilters.selectedBrands + brand
                            }
                            tempFilters = tempFilters.copy(selectedBrands = newSelection)
                        }
                    )
                }
            }
            
            // Stock Filter
            item {
                SwitchFilter(
                    label = "In Stock Only",
                    checked = tempFilters.inStockOnly,
                    onCheckedChange = { tempFilters = tempFilters.copy(inStockOnly = it) }
                )
            }
            
            // Sale Filter
            item {
                SwitchFilter(
                    label = "On Sale Only",
                    checked = tempFilters.onSaleOnly,
                    onCheckedChange = { tempFilters = tempFilters.copy(onSaleOnly = it) }
                )
            }
            
            // Apply Button
            item {
                Button(
                    onClick = {
                        onFiltersChanged(tempFilters)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 16.dp)
                ) {
                    Text("Apply Filters")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PriceRangeFilter(
    minPrice: Double,
    maxPrice: Double,
    priceRange: Pair<Double, Double>,
    onPriceRangeChanged: (Double, Double) -> Unit
) {
    var sliderPosition by remember { 
        mutableStateOf(minPrice.toFloat()..maxPrice.toFloat()) 
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Price Range",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "₹${sliderPosition.start.toInt()} - ₹${sliderPosition.endInclusive.toInt()}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Range Slider
        RangeSlider(
            value = sliderPosition,
            onValueChange = { range ->
                sliderPosition = range
                onPriceRangeChanged(range.start.toDouble(), range.endInclusive.toDouble())
            },
            valueRange = priceRange.first.toFloat()..priceRange.second.toFloat(),
            steps = ((priceRange.second - priceRange.first) / SearchConstants.PRICE_SLIDER_STEP).toInt().coerceAtLeast(0),
            modifier = Modifier.fillMaxWidth()
        )
        
        // Min and Max labels
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "₹${priceRange.first.toInt()}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "₹${priceRange.second.toInt()}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun CategoryFilter(
    categories: List<CategoryDto>,
    selectedCategories: Set<String>,
    onCategoryToggle: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Categories",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        categories.forEach { category ->
            CheckboxFilter(
                label = category.name,
                checked = category.id in selectedCategories,
                onCheckedChange = { onCategoryToggle(category.id) }
            )
        }
    }
}

@Composable
private fun BrandFilter(
    brands: List<String>,
    selectedBrands: Set<String>,
    onBrandToggle: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Brands",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        brands.forEach { brand ->
            CheckboxFilter(
                label = brand,
                checked = brand in selectedBrands,
                onCheckedChange = { onBrandToggle(brand) }
            )
        }
    }
}

@Composable
private fun CheckboxFilter(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun SwitchFilter(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}
