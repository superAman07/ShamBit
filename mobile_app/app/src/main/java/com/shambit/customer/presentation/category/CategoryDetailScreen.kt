package com.shambit.customer.presentation.category

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack

import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.R
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.util.rememberHapticFeedback

/**
 * CategoryDetailScreen
 * Displays category header and subcategories in a grid
 * 
 * Features:
 * - Category header with banner image
 * - Subcategories in 3-column grid
 * - Navigation to product listing on subcategory click
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    categoryId: String,
    viewModel: CategoryProductsViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToSubcategory: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    
    // Load category data
    LaunchedEffect(categoryId) {
        android.util.Log.d("CategoryDetailScreen", "LaunchedEffect triggered for categoryId: $categoryId")
        viewModel.loadCategory(categoryId)
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.category?.name ?: "Category",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        hapticFeedback?.performLightImpact()
                        onNavigateBack()
                    }) {
                        Icon(
                            imageVector = Icons.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    LoadingState()
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: "Failed to load category",
                        onRetry = { viewModel.loadCategory(categoryId) }
                    )
                }
                uiState.category != null -> {
                    CategoryDetailContent(
                        category = uiState.category!!,
                        subcategories = uiState.subcategories,
                        isLoadingSubcategories = uiState.isLoadingSubcategories,
                        onSubcategoryClick = { subcategory ->
                            hapticFeedback?.performLightImpact()
                            onNavigateToSubcategory(subcategory.id)
                        }
                    )
                }
            }
        }
    }
}

/**
 * CategoryDetailContent
 * Main content showing category header and subcategories
 */
@Composable
private fun CategoryDetailContent(
    category: com.shambit.customer.data.remote.dto.response.CategoryDto,
    subcategories: List<SubcategoryDto>,
    isLoadingSubcategories: Boolean,
    onSubcategoryClick: (SubcategoryDto) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
    ) {
        // Category header with banner
        if (category.bannerUrl != null || category.imageUrl != null) {
            AsyncImage(
                model = category.getFullBannerUrl() ?: category.getFullImageUrl(),
                contentDescription = "Category banner: ${category.name}",
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp)),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(R.drawable.placeholder_banner),
                error = painterResource(R.drawable.placeholder_banner)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Category description
        if (!category.description.isNullOrBlank()) {
            Text(
                text = category.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Subcategories section
        android.util.Log.d("CategoryDetailScreen", "Rendering subcategories section:")
        android.util.Log.d("CategoryDetailScreen", "  - isLoadingSubcategories: $isLoadingSubcategories")
        android.util.Log.d("CategoryDetailScreen", "  - subcategories.size: ${subcategories.size}")
        android.util.Log.d("CategoryDetailScreen", "  - subcategories: ${subcategories.map { it.name }}")
        
        when {
            isLoadingSubcategories -> {
                // Loading subcategories with shimmer effect
                Text(
                    text = "Subcategories",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(6) { // Show 6 shimmer placeholders
                        SubcategoryCardSkeleton()
                    }
                }
            }
            subcategories.isNotEmpty() -> {
                Text(
                    text = "Subcategories",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2), // Changed to 2 columns for better display
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(
                        items = subcategories,
                        key = { it.id }
                    ) { subcategory ->
                        SubcategoryCard(
                            subcategory = subcategory,
                            onClick = { onSubcategoryClick(subcategory) }
                        )
                    }
                }
            }
            else -> {
                // No subcategories message
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "No subcategories available",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No products here yet — explore other categories",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

/**
 * SubcategoryCard
 * Beautiful, professional card displaying a subcategory with image, name, and product count
 */
@Composable
private fun SubcategoryCard(
    subcategory: SubcategoryDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 4.dp,
            pressedElevation = 8.dp
        ),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Subcategory image with rounded corners
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                AsyncImage(
                    model = subcategory.getFullImageUrl(),
                    contentDescription = "Subcategory: ${subcategory.name}",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    placeholder = painterResource(R.drawable.ic_category_placeholder),
                    error = painterResource(R.drawable.ic_category_placeholder)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Subcategory name
            Text(
                text = subcategory.name,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.fillMaxWidth()
            )
            
            // Product count (if available)
            if (subcategory.productCount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${subcategory.productCount} products",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

/**
 * SubcategoryCardSkeleton
 * Shimmer loading placeholder for subcategory cards
 */
@Composable
private fun SubcategoryCardSkeleton(
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Image placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Name placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.8f)
                    .height(16.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Product count placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.6f)
                    .height(12.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
            )
        }
    }
}
