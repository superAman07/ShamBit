package com.shambit.customer.presentation.product.detail

import androidx.compose.animation.core.animateDpAsState
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.data.remote.dto.response.ProductDto
import com.shambit.customer.ui.components.AddToCartButton
import com.shambit.customer.ui.components.DeliveryInfo
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.ui.components.PriceDisplay
import com.shambit.customer.ui.components.ProductBadges
import com.shambit.customer.ui.components.ProductCard
import com.shambit.customer.ui.components.RatingStars
import com.shambit.customer.ui.components.StockBadge
import com.shambit.customer.ui.components.UnitInfo
import com.shambit.customer.ui.components.WishlistIconButton
import com.shambit.customer.ui.components.parseBadges
import com.shambit.customer.util.rememberHapticFeedback

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    viewModel: ProductDetailViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToCart: () -> Unit,
    onNavigateToProduct: (String) -> Unit,
    onShare: (ProductDto) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    val listState = rememberLazyListState()
    
    val showElevation by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 0
        }
    }
    
    val elevation by animateDpAsState(
        targetValue = if (showElevation) 4.dp else 0.dp,
        label = "app_bar_elevation"
    )
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (showElevation && uiState.product != null) {
                        Text(
                            text = uiState.product!!.name,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        uiState.product?.let { onShare(it) }
                    }) {
                        Icon(Icons.Default.Share, "Share")
                    }
                    IconButton(onClick = onNavigateToCart) {
                        Icon(Icons.Default.ShoppingCart, "Cart")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
            )
        },
        bottomBar = {
            if (uiState.product != null) {
                ProductDetailBottomBar(
                    product = uiState.product!!,
                    cartQuantity = uiState.cartQuantity,
                    isInWishlist = uiState.isInWishlist,
                    isAddingToCart = uiState.isAddingToCart,
                    isTogglingWishlist = uiState.isTogglingWishlist,
                    onAddToCart = viewModel::addToCart,
                    onIncrementCart = viewModel::incrementCart,
                    onDecrementCart = viewModel::decrementCart,
                    onToggleWishlist = viewModel::toggleWishlist,
                    hapticFeedback = hapticFeedback
                )
            }
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> LoadingState()
            uiState.error != null -> ErrorState(
                message = uiState.error!!,
                onRetry = viewModel::retry
            )
            uiState.product != null -> {
                ProductDetailContent(
                    product = uiState.product!!,
                    similarProducts = uiState.similarProducts,
                    currentImageIndex = uiState.currentImageIndex,
                    onImageIndexChange = viewModel::updateImageIndex,
                    onSimilarProductClick = onNavigateToProduct,
                    listState = listState,
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun ProductDetailContent(
    product: ProductDto,
    similarProducts: List<ProductDto>,
    currentImageIndex: Int,
    onImageIndexChange: (Int) -> Unit,
    onSimilarProductClick: (String) -> Unit,
    listState: androidx.compose.foundation.lazy.LazyListState,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxSize()
    ) {
        // Image Carousel
        item {
            ImageCarousel(
                imageUrls = product.getAllImageUrls(),
                currentIndex = currentImageIndex,
                onIndexChange = onImageIndexChange,
                badges = parseBadges(product.badges),
                stockQuantity = product.stockQuantity
            )
        }
        
        // Product Info Section
        item {
            ProductInfoSection(product = product)
        }
        
        // Product Description
        if (!product.description.isNullOrBlank()) {
            item {
                ProductDescriptionSection(description = product.description)
            }
        }
        
        // Detailed Description
        if (!product.detailedDescription.isNullOrBlank()) {
            item {
                DetailedDescriptionSection(description = product.detailedDescription)
            }
        }
        
        // Product Attributes
        if (!product.attributes.isNullOrEmpty()) {
            item {
                ProductAttributesSection(attributes = product.attributes)
            }
        }
        
        // Similar Products
        if (similarProducts.isNotEmpty()) {
            item {
                SimilarProductsSection(
                    products = similarProducts,
                    onProductClick = onSimilarProductClick
                )
            }
        }
        
        // Bottom spacing
        item {
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ImageCarousel(
    imageUrls: List<String>,
    currentIndex: Int,
    onIndexChange: (Int) -> Unit,
    badges: List<com.shambit.customer.ui.components.ProductBadgeType>,
    stockQuantity: Int,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(pageCount = { imageUrls.size })
    
    LaunchedEffect(pagerState.currentPage) {
        onIndexChange(pagerState.currentPage)
    }
    
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(400.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize()
        ) { page ->
            AsyncImage(
                model = imageUrls.getOrNull(page),
                contentDescription = "Product image ${page + 1}",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        }
        
        // Badges overlay
        if (badges.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
            ) {
                ProductBadges(badges = badges)
            }
        }
        
        // Stock badge
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp)
        ) {
            StockBadge(stockQuantity = stockQuantity)
        }
        
        // Page indicators
        if (imageUrls.size > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                repeat(imageUrls.size) { index ->
                    Box(
                        modifier = Modifier
                            .size(if (index == currentIndex) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == currentIndex)
                                    MaterialTheme.colorScheme.primary
                                else
                                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun ProductInfoSection(
    product: ProductDto,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Brand
        if (!product.brandName.isNullOrBlank()) {
            Text(
                text = product.brandName,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(4.dp))
        }
        
        // Product Name
        Text(
            text = product.name,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Unit Info
        UnitInfo(
            unitSize = product.unitSize,
            unitType = product.unitType
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Rating
        RatingStars(
            rating = product.averageRating,
            reviewCount = product.reviewCount
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Price
        PriceDisplay(product = product)
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Delivery Info
        DeliveryInfo(deliveryTime = product.deliveryTime)
    }
}

@Composable
private fun ProductDescriptionSection(
    description: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = "Description",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun DetailedDescriptionSection(
    description: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = "Product Details",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ProductAttributesSection(
    attributes: List<com.shambit.customer.data.remote.dto.response.ProductAttributeDto>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = "Specifications",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        
        attributes.forEach { attribute ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = attribute.attributeName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = attribute.attributeValue,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun SimilarProductsSection(
    products: List<ProductDto>,
    onProductClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp)
    ) {
        Text(
            text = "Similar Products",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(products, key = { it.id }) { product ->
                ProductCard(
                    product = product,
                    onClick = { onProductClick(product.id) }
                )
            }
        }
    }
}

@Composable
private fun ProductDetailBottomBar(
    product: ProductDto,
    cartQuantity: Int,
    isInWishlist: Boolean,
    isAddingToCart: Boolean,
    isTogglingWishlist: Boolean,
    onAddToCart: () -> Unit,
    onIncrementCart: () -> Unit,
    onDecrementCart: () -> Unit,
    onToggleWishlist: () -> Unit,
    hapticFeedback: com.shambit.customer.util.HapticFeedbackManager?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Wishlist button
        WishlistIconButton(
            isInWishlist = isInWishlist,
            isLoading = isTogglingWishlist,
            onToggle = onToggleWishlist,
            hapticFeedback = hapticFeedback,
            modifier = Modifier.size(48.dp)
        )
        
        // Add to cart button
        AddToCartButton(
            quantity = cartQuantity,
            isLoading = isAddingToCart,
            isOutOfStock = product.isOutOfStock(),
            onAddToCart = onAddToCart,
            onIncrement = onIncrementCart,
            onDecrement = onDecrementCart,
            modifier = Modifier.weight(1f),
            hapticFeedback = hapticFeedback
        )
    }
}
