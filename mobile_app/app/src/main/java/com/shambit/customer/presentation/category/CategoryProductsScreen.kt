package com.shambit.customer.presentation.category

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.ui.components.EmptyState
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.ui.components.ProductCard
import com.shambit.customer.util.rememberHapticFeedback

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryProductsScreen(
    viewModel: CategoryProductsViewModel = hiltViewModel(),
    cartViewModel: com.shambit.customer.presentation.cart.CartViewModel = hiltViewModel(),
    wishlistViewModel: com.shambit.customer.presentation.wishlist.WishlistViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToProduct: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val cartState by cartViewModel.uiState.collectAsState()
    val wishlistState by wishlistViewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    val gridState = rememberLazyGridState()
    val pullToRefreshState = rememberPullToRefreshState()
    
    // Handle pull-to-refresh
    if (pullToRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            viewModel.refresh()
        }
    }
    
    // Reset pull-to-refresh when loading completes
    LaunchedEffect(uiState.isLoading) {
        if (!uiState.isLoading) {
            pullToRefreshState.endRefresh()
        }
    }
    
    // Load more when reaching end
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisibleItem = gridState.layoutInfo.visibleItemsInfo.lastOrNull()
            val totalItems = gridState.layoutInfo.totalItemsCount
            lastVisibleItem != null && lastVisibleItem.index >= totalItems - 4
        }
    }
    
    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && uiState.hasMorePages && !uiState.isLoadingMore) {
            viewModel.loadMoreProducts()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.category?.name ?: "Products",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::showSortDialog) {
                        Icon(Icons.Filled.ArrowDropDown, "Sort")
                    }
                }
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
                uiState.isLoading && uiState.products.isEmpty() -> {
                    LoadingState()
                }
                uiState.error != null && uiState.products.isEmpty() -> {
                    ErrorState(
                        message = uiState.error!!,
                        onRetry = viewModel::retry
                    )
                }
                uiState.products.isEmpty() -> {
                    EmptyState(message = "No products found in this category")
                }
                else -> {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Category header
                        if (uiState.category != null) {
                            CategoryHeader(
                                category = uiState.category!!,
                                productCount = uiState.products.size
                            )
                        }
                        
                        // Sort indicator
                        SortIndicator(
                            sortOption = uiState.sortOption,
                            onSortClick = viewModel::showSortDialog
                        )
                        
                        // Products grid
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            state = gridState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.products, key = { it.id }) { product ->
                                ProductCard(
                                    product = product,
                                    cartQuantity = cartState.items.find { it.product.id == product.id }?.quantity ?: 0,
                                    isInWishlist = wishlistState.wishlistItems.any { it.productId == product.id },
                                    onClick = { onNavigateToProduct(product.id) },
                                    onAddToCart = { cartViewModel.addToCart(product.id, 1) },
                                    onIncrementCart = { cartViewModel.incrementQuantity(product.id) },
                                    onDecrementCart = { cartViewModel.decrementQuantity(product.id) },
                                    onToggleWishlist = { wishlistViewModel.removeFromWishlist(product.id) },
                                    hapticFeedback = hapticFeedback
                                )
                            }
                            
                            // Loading more indicator
                            if (uiState.isLoadingMore) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Pull-to-refresh indicator
            PullToRefreshContainer(
                state = pullToRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
        
        // Sort dialog
        if (uiState.showSortDialog) {
            SortDialog(
                currentSortOption = uiState.sortOption,
                onDismiss = viewModel::hideSortDialog,
                onSortOptionSelected = viewModel::applySortOption
            )
        }
    }
}

@Composable
private fun CategoryHeader(
    category: com.shambit.customer.data.remote.dto.response.CategoryDto,
    productCount: Int,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(16.dp)
    ) {
        // Category banner image
        if (category.bannerUrl != null) {
            AsyncImage(
                model = category.getFullBannerUrl(),
                contentDescription = "Category banner",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        
        // Category name
        Text(
            text = category.name,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        // Product count
        Text(
            text = "$productCount products",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        // Description
        if (!category.description.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = category.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SortIndicator(
    sortOption: SortOption,
    onSortClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Sort by: ${sortOption.displayName}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        TextButton(onClick = onSortClick) {
            Icon(
                Icons.Filled.ArrowDropDown,
                contentDescription = "Sort",
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.padding(horizontal = 4.dp))
            Text("Change")
        }
    }
}

@Composable
private fun SortDialog(
    currentSortOption: SortOption,
    onDismiss: () -> Unit,
    onSortOptionSelected: (SortOption) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sort Products") },
        text = {
            Column {
                SortOption.entries.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = option == currentSortOption,
                            onClick = { onSortOptionSelected(option) }
                        )
                        Spacer(modifier = Modifier.padding(horizontal = 8.dp))
                        Text(
                            text = option.displayName,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
